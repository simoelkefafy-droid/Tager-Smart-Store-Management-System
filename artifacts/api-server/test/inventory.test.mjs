import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const artifactDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const requireFromDb = createRequire(
  new URL("../../../lib/db/package.json", import.meta.url),
);
const { Pool } = requireFromDb("pg");

const ownerId = "regression-owner";
let testBuildDir;
const requestTag = `inventory-regression-${randomUUID()}`;
const productIds = [];
let adminDatabase;
let database;
let testSchema;
let server;
let baseUrl;
let testDatabaseUrl;

const testSchemaDdl = `
  CREATE TABLE tager_suppliers (
    id serial PRIMARY KEY,
    owner_id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL DEFAULT '',
    products text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE tager_products (
    id serial PRIMARY KEY,
    owner_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    purchase_price numeric(12, 2) NOT NULL,
    selling_price numeric(12, 2) NOT NULL,
    quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_stock integer NOT NULL DEFAULT 0,
    supplier_id integer REFERENCES tager_suppliers(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE tager_sales (
    id serial PRIMARY KEY,
    owner_id text NOT NULL,
    total numeric(12, 2) NOT NULL,
    profit numeric(12, 2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE tager_sale_items (
    id serial PRIMARY KEY,
    sale_id integer NOT NULL REFERENCES tager_sales(id) ON DELETE CASCADE,
    product_id integer NOT NULL REFERENCES tager_products(id) ON DELETE RESTRICT,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12, 2) NOT NULL,
    unit_cost numeric(12, 2) NOT NULL,
    line_total numeric(12, 2) NOT NULL
  );
  CREATE TABLE tager_inventory_movements (
    id serial PRIMARY KEY,
    owner_id text NOT NULL,
    product_id integer REFERENCES tager_products(id) ON DELETE SET NULL,
    product_name text NOT NULL,
    type text NOT NULL CHECK (type IN ('opening', 'sale', 'supply', 'adjustment')),
    quantity integer NOT NULL CHECK (quantity > 0),
    reason text NOT NULL,
    balance_before integer NOT NULL CHECK (balance_before >= 0),
    balance_after integer NOT NULL CHECK (balance_after >= 0),
    sale_id integer REFERENCES tager_sales(id) ON DELETE SET NULL,
    supplier_id integer REFERENCES tager_suppliers(id) ON DELETE SET NULL,
    request_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
      (type = 'sale' AND sale_id IS NOT NULL)
      OR (type <> 'sale' AND sale_id IS NULL)
    ),
    CHECK (type <> 'supply' OR request_id IS NOT NULL),
    CHECK (type <> 'opening' OR balance_before = 0),
    CHECK (
      (type = 'sale' AND balance_after = balance_before - quantity)
      OR (type IN ('opening', 'supply') AND balance_after = balance_before + quantity)
      OR (type = 'adjustment' AND abs(balance_after - balance_before) = quantity)
    )
  );
  CREATE UNIQUE INDEX tager_inventory_sale_product_unique
    ON tager_inventory_movements (sale_id, product_id) WHERE sale_id IS NOT NULL;
  CREATE UNIQUE INDEX tager_inventory_opening_product_unique
    ON tager_inventory_movements (owner_id, product_id)
    WHERE type = 'opening' AND product_id IS NOT NULL;
  CREATE UNIQUE INDEX tager_inventory_request_unique
    ON tager_inventory_movements (owner_id, request_id) WHERE request_id IS NOT NULL;
`;

async function unusedPort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function waitUntilReady(child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `API server exited before becoming ready (code ${child.exitCode})`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/api/healthz`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API server did not become ready within 15 seconds");
}

async function api(pathname, { method = "GET", body, owner = ownerId } = {}) {
  const response = await fetch(`${baseUrl}/api${pathname}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(owner ? { "x-test-owner": owner } : { "x-tager-demo": "true" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

async function createProduct(name, quantity) {
  const response = await api("/products", {
    method: "POST",
    body: {
      name,
      category: "Regression test",
      purchasePrice: 3,
      sellingPrice: 7,
      quantity,
      minStock: 0,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  productIds.push(response.data.id);
  return response.data;
}

async function movementRows(productId) {
  const { rows } = await database.query(
    `SELECT id, product_id AS "productId", type, quantity, reason,
            balance_before AS "balanceBefore", balance_after AS "balanceAfter",
            sale_id AS "saleId", supplier_id AS "supplierId", request_id AS "requestId"
     FROM tager_inventory_movements
     WHERE product_id = $1
     ORDER BY id`,
    [productId],
  );
  return rows;
}

async function saleCountForProducts(ids) {
  const { rows } = await database.query(
    `SELECT count(DISTINCT sale_id)::int AS count
     FROM tager_sale_items
     WHERE product_id = ANY($1::int[])`,
    [ids],
  );
  return rows[0].count;
}

async function productQuantity(productId) {
  const { rows } = await database.query(
    "SELECT quantity FROM tager_products WHERE id = $1 AND owner_id = $2",
    [productId, ownerId],
  );
  assert.equal(
    rows.length,
    1,
    `Expected product ${productId} to remain in the database`,
  );
  return rows[0].quantity;
}

test("purchases are tenant isolated, atomic, retry safe and use weighted cost", async () => {
  assert.equal((await api("/products", { owner: null })).status, 401);
  const product = await createProduct(`${requestTag}-purchased`, 10);
  const supplier = await api("/suppliers", { method: "POST", body: { name: requestTag, phone: "", products: "" } });
  assert.equal(supplier.status, 201);
  const other = await api("/products", { owner: "other-store" });
  assert.equal(other.status, 200);
  assert.equal(other.data.some(p => p.id === product.id), false);
  assert.equal((await api(`/products/${product.id}`, { method: "DELETE", owner: "other-store" })).status, 404);
  const payload = {
    supplierId: supplier.data.id, requestId: randomUUID(), reference: "test receipt",
    items: [{ productId: product.id, quantity: 10, unitCost: 5 }],
  };
  assert.equal((await api("/purchases", { method: "POST", owner: "other-store", body: payload })).status, 400);
  const [first, retry] = await Promise.all([
    api("/purchases", { method: "POST", body: payload }),
    api("/purchases", { method: "POST", body: payload }),
  ]);
  assert.equal(first.status, 201, JSON.stringify(first.data));
  assert.equal(retry.status, 201, JSON.stringify(retry.data));
  assert.equal(first.data.id, retry.data.id);
  assert.equal(first.data.total, 50);
  assert.equal(await productQuantity(product.id), 20);
  const { rows } = await database.query("SELECT purchase_price FROM tager_products WHERE id=$1", [product.id]);
  assert.equal(Number(rows[0].purchase_price), 4);
  const changed = await api("/purchases", { method: "POST", body: { ...payload, reference: "changed" } });
  assert.equal(changed.status, 409);
  const failure = await api("/purchases", { method: "POST", body: {
    ...payload, requestId: randomUUID(), items: [...payload.items, { productId: 2147483647, quantity: 1, unitCost: 10 }],
  }});
  assert.equal(failure.status, 400);
  assert.equal(await productQuantity(product.id), 20);
  const sale = await api("/sales", { method: "POST", body: { items: [{ productId: product.id, quantity: 2 }] } });
  assert.equal(sale.status, 201);
  assert.equal(sale.data.total, 14);
  assert.equal(sale.data.profit, 6);
  assert.equal(await productQuantity(product.id), 18);
  assert.equal((await api("/purchases", { owner: "other-store" })).data.length, 0);
  assert.equal((await api("/sales", { owner: "other-store" })).data.length, 0);
  assert.equal((await api("/inventory-movements", { owner: "other-store" })).data.total, 0);
  assert.equal((await api("/purchases")).data.filter(p => p.id === first.data.id).length, 1);
});

before(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required to run inventory regression tests",
    );
  }
  adminDatabase = new Pool({ connectionString: process.env.DATABASE_URL });
  testSchema = `inventory_test_${randomUUID().replaceAll("-", "")}`;
  await adminDatabase.query(`CREATE SCHEMA "${testSchema}"`);
  const isolatedUrl = new URL(process.env.DATABASE_URL);
  isolatedUrl.searchParams.set("options", `-c search_path=${testSchema}`);
  testDatabaseUrl = isolatedUrl.toString();
  database = new Pool({ connectionString: testDatabaseUrl });
  await database.query(testSchemaDdl);
  await database.query(`
    CREATE TABLE tager_purchases (
      id serial PRIMARY KEY, owner_id text NOT NULL,
      supplier_id integer REFERENCES tager_suppliers(id) ON DELETE SET NULL,
      supplier_name text NOT NULL, reference text NOT NULL DEFAULT '',
      request_id text NOT NULL, total numeric(12,2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,request_id)
    );
    CREATE TABLE tager_purchase_items (
      id serial PRIMARY KEY, purchase_id integer NOT NULL REFERENCES tager_purchases(id),
      product_id integer NOT NULL REFERENCES tager_products(id),
      product_name text NOT NULL, quantity integer NOT NULL,
      unit_cost numeric(12,2) NOT NULL, line_total numeric(12,2) NOT NULL
    );
  `);
  // Authentication is stubbed only in this disposable test bundle, never in the application.
  testBuildDir = await mkdtemp(path.join(tmpdir(), "tager-api-test-"));
  await build({
    stdin: {
      contents: `import express from "express"; import router from "./src/routes/tager";
        const app=express(); app.use(express.json());
        app.get("/api/healthz",(_req,res)=>res.json({status:"ok"}));
        app.use("/api",router); app.listen(Number(process.env.PORT),"127.0.0.1");`,
      resolveDir: artifactDir, loader: "ts",
    },
    bundle: true, platform: "node", format: "esm", external: ["pg-native"],
    outfile: path.join(testBuildDir, "server.mjs"),
    banner: { js: `import {createRequire} from "node:module"; const require=createRequire(import.meta.url);` },
    plugins: [{
      name: "test-only-auth",
      setup(builder) {
        builder.onResolve({ filter: /^@clerk\/express$/ }, () => ({ path: "auth", namespace: "test-only" }));
        builder.onLoad({ filter: /.*/, namespace: "test-only" }, () => ({
          contents: `export const getAuth=req=>({userId:req.headers["x-test-owner"]||null});`,
        }));
      },
    }],
  });

  const port = await unusedPort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    ["--enable-source-maps", path.join(testBuildDir, "server.mjs")],
    {
      cwd: artifactDir,
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
        PORT: String(port),
        NODE_ENV: "test",
      },
      stdio: "ignore",
    },
  );
  await waitUntilReady(server);
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  try {
    if (testBuildDir) await rm(testBuildDir, { recursive: true, force: true });
    if (database) await database.end();
    if (testSchema && adminDatabase) {
      await adminDatabase.query(
        `DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`,
      );
    }
  } finally {
    if (adminDatabase) await adminDatabase.end();
  }
});

test("inventory API preserves balances and movement history under failure and concurrency", async (t) => {
  const ownSupplierResponse = await api("/suppliers", {
    method: "POST",
    body: { name: requestTag, phone: "", products: "test" },
  });
  assert.equal(
    ownSupplierResponse.status,
    201,
    JSON.stringify(ownSupplierResponse.data),
  );
  const ownSupplierId = ownSupplierResponse.data.id;

  const foreignSupplierResult = await database.query(
    `INSERT INTO tager_suppliers (owner_id, name, phone, products)
     VALUES ($1, $2, '', '') RETURNING id`,
    [`foreign-${requestTag}`, requestTag],
  );
  const foreignSupplierId = foreignSupplierResult.rows[0].id;

  await t.test(
    "adjustments require and persist a reason with correct balances",
    async () => {
      const product = await createProduct(`${requestTag}-adjustment`, 5);
      const updateBody = {
        name: product.name,
        category: product.category,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        quantity: 4,
        minStock: product.minStock,
      };

      const beforeMissingReason = await movementRows(product.id);
      const missingReason = await api(`/products/${product.id}`, {
        method: "PATCH",
        body: updateBody,
      });
      assert.equal(missingReason.status, 400);
      assert.equal(await productQuantity(product.id), 5);
      assert.deepEqual(await movementRows(product.id), beforeMissingReason);

      const adjusted = await api(`/products/${product.id}`, {
        method: "PATCH",
        body: {
          ...updateBody,
          quantity: 8,
          reason: "  Cycle count correction  ",
        },
      });
      assert.equal(adjusted.status, 200, JSON.stringify(adjusted.data));
      assert.equal(await productQuantity(product.id), 8);
      assert.deepEqual(await movementRows(product.id), [
        ...beforeMissingReason,
        {
          id: (await movementRows(product.id))[1].id,
          productId: product.id,
          type: "adjustment",
          quantity: 3,
          reason: "Cycle count correction",
          balanceBefore: 5,
          balanceAfter: 8,
          saleId: null,
          supplierId: null,
          requestId: null,
        },
      ]);
    },
  );

  await t.test(
    "supplier ownership and duplicate supply IDs cannot change stock twice",
    async () => {
      const product = await createProduct(`${requestTag}-supply`, 2);
      const originalMovements = await movementRows(product.id);
      const invalidSupplier = await api("/inventory-movements", {
        method: "POST",
        body: {
          productId: product.id,
          supplierId: foreignSupplierId,
          quantity: 4,
          reason: "Supplier ownership check",
          requestId: `${requestTag}-foreign-supplier`,
        },
      });
      assert.equal(invalidSupplier.status, 400);
      assert.equal(await productQuantity(product.id), 2);
      assert.deepEqual(await movementRows(product.id), originalMovements);

      const supplyBody = {
        productId: product.id,
        supplierId: ownSupplierId,
        quantity: 4,
        reason: "Restock",
        requestId: `${requestTag}-supply-once`,
      };
      const supply = await api("/inventory-movements", {
        method: "POST",
        body: supplyBody,
      });
      assert.equal(supply.status, 201, JSON.stringify(supply.data));
      assert.equal(supply.data.balanceBefore, 2);
      assert.equal(supply.data.balanceAfter, 6);
      assert.equal(supply.data.supplierId, ownSupplierId);
      assert.equal(await productQuantity(product.id), 6);

      const duplicate = await api("/inventory-movements", {
        method: "POST",
        body: supplyBody,
      });
      assert.equal(duplicate.status, 201, JSON.stringify(duplicate.data));
      assert.equal(await productQuantity(product.id), 6);
      const movementsAfterDuplicate = await movementRows(product.id);
      assert.equal(
        movementsAfterDuplicate.length,
        originalMovements.length + 1,
      );
      assert.deepEqual(movementsAfterDuplicate.at(-1), {
        id: supply.data.id,
        productId: product.id,
        type: "supply",
        quantity: 4,
        reason: "Restock",
        balanceBefore: 2,
        balanceAfter: 6,
        saleId: null,
        supplierId: ownSupplierId,
        requestId: supplyBody.requestId,
      });

      const conflictingDuplicate = await api("/inventory-movements", {
        method: "POST",
        body: { ...supplyBody, quantity: 5 },
      });
      assert.equal(conflictingDuplicate.status, 409);
      assert.equal(await productQuantity(product.id), 6);
      assert.deepEqual(await movementRows(product.id), movementsAfterDuplicate);
    },
  );

  await t.test(
    "a failed multi-product sale rolls back all stock and history changes",
    async () => {
      const first = await createProduct(`${requestTag}-rollback-a`, 5);
      const second = await createProduct(`${requestTag}-rollback-b`, 1);
      const before = {
        firstQuantity: await productQuantity(first.id),
        secondQuantity: await productQuantity(second.id),
        firstMovements: await movementRows(first.id),
        secondMovements: await movementRows(second.id),
      };

      const failedSale = await api("/sales", {
        method: "POST",
        body: {
          items: [
            { productId: first.id, quantity: 2 },
            { productId: second.id, quantity: 2 },
          ],
        },
      });
      assert.equal(failedSale.status, 409);
      assert.equal(await productQuantity(first.id), before.firstQuantity);
      assert.equal(await productQuantity(second.id), before.secondQuantity);
      assert.deepEqual(await movementRows(first.id), before.firstMovements);
      assert.deepEqual(await movementRows(second.id), before.secondMovements);
      assert.equal(await saleCountForProducts([first.id, second.id]), 0);
    },
  );

  await t.test(
    "concurrent sales cannot oversell and persist accurate before/after balances",
    async () => {
      const product = await createProduct(`${requestTag}-concurrent`, 5);
      const saleBody = { items: [{ productId: product.id, quantity: 4 }] };
      const responses = await Promise.all([
        api("/sales", { method: "POST", body: saleBody }),
        api("/sales", { method: "POST", body: saleBody }),
      ]);

      assert.deepEqual(
        responses.map(({ status }) => status).sort(),
        [201, 409],
      );
      const successfulSale = responses.find(({ status }) => status === 201);
      assert.ok(successfulSale);
      assert.equal(await productQuantity(product.id), 1);

      const movements = await movementRows(product.id);
      assert.equal(movements.length, 2);
      assert.deepEqual(movements[1], {
        id: movements[1].id,
        productId: product.id,
        type: "sale",
        quantity: 4,
        reason: `بيع رقم ${successfulSale.data.id}`,
        balanceBefore: 5,
        balanceAfter: 1,
        saleId: successfulSale.data.id,
        supplierId: null,
        requestId: null,
      });

      const beforeFailedSale = await movementRows(product.id);
      const saleCountBeforeFailure = await saleCountForProducts([product.id]);
      const insufficientSale = await api("/sales", {
        method: "POST",
        body: { items: [{ productId: product.id, quantity: 2 }] },
      });
      assert.equal(insufficientSale.status, 409);
      assert.equal(await productQuantity(product.id), 1);
      assert.deepEqual(await movementRows(product.id), beforeFailedSale);
      assert.equal(
        await saleCountForProducts([product.id]),
        saleCountBeforeFailure,
      );
    },
  );
});
