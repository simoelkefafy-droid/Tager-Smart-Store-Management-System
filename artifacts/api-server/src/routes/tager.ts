import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  lt,
  sql,
} from "drizzle-orm";
import {
  db,
  inventoryMovementsTable,
  productsTable,
  saleItemsTable,
  salesTable,
  suppliersTable,
} from "@workspace/db";
import {
  CreateInventoryMovementBody,
  CreateInventoryMovementResponse,
  CreateProductBody,
  CreateProductResponse,
  CreateSaleBody,
  CreateSaleResponse,
  CreateSupplierBody,
  CreateSupplierResponse,
  DeleteProductParams,
  DeleteSupplierParams,
  GetDashboardResponse,
  GetReportsQueryParams,
  GetReportsResponse,
  ListProductsResponse,
  ListInventoryMovementsQueryParams,
  ListInventoryMovementsResponse,
  ListSalesQueryParams,
  ListSalesResponse,
  ListSuppliersResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  UpdateSupplierBody,
  UpdateSupplierParams,
  UpdateSupplierResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

class SaleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

class InventoryMovementError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const inventoryHistoryReady = new Set<string>();

async function ensureInventoryHistory(owner: string): Promise<void> {
  if (inventoryHistoryReady.has(owner)) return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${owner}))`);
    const [existing] = await tx
      .select({ id: inventoryMovementsTable.id })
      .from(inventoryMovementsTable)
      .where(eq(inventoryMovementsTable.ownerId, owner))
      .limit(1);
    if (existing) return;

    const products = await tx
      .select()
      .from(productsTable)
      .where(eq(productsTable.ownerId, owner));
    const sales = await tx
      .select()
      .from(salesTable)
      .where(eq(salesTable.ownerId, owner))
      .orderBy(salesTable.createdAt);
    const saleLines = sales.length
      ? await tx
          .select()
          .from(saleItemsTable)
          .where(inArray(saleItemsTable.saleId, sales.map((sale) => sale.id)))
      : [];
    const soldByProduct = new Map<number, number>();
    for (const line of saleLines) {
      soldByProduct.set(
        line.productId,
        (soldByProduct.get(line.productId) ?? 0) + line.quantity,
      );
    }
    const balances = new Map<number, number>();
    const openingDate = sales.length
      ? new Date(Math.min(...sales.map((sale) => sale.createdAt.getTime())) - 1)
      : null;
    const rows: Array<typeof inventoryMovementsTable.$inferInsert> = [];
    for (const product of products) {
      const openingQuantity = product.quantity + (soldByProduct.get(product.id) ?? 0);
      balances.set(product.id, openingQuantity);
      if (openingQuantity > 0) {
        rows.push({
          ownerId: owner,
          productId: product.id,
          productName: product.name,
          type: "in",
          quantity: openingQuantity,
          previousQuantity: 0,
          newQuantity: openingQuantity,
          reason: "رصيد افتتاحي قبل تفعيل سجل الحركة",
          createdAt: openingDate ?? product.createdAt,
        });
      }
    }
    for (const sale of sales) {
      const saleProducts = new Map<number, (typeof saleLines)[number]>();
      for (const line of saleLines) {
        if (line.saleId !== sale.id) continue;
        const combined = saleProducts.get(line.productId);
        if (combined) {
          saleProducts.set(line.productId, {
            ...combined,
            quantity: combined.quantity + line.quantity,
          });
        } else {
          saleProducts.set(line.productId, line);
        }
      }
      for (const [productId, line] of saleProducts) {
        const previousQuantity = balances.get(productId);
        if (previousQuantity === undefined) continue;
        const newQuantity = Math.max(0, previousQuantity - line.quantity);
        rows.push({
          ownerId: owner,
          productId,
          productName: line.productName,
          type: "out",
          quantity: line.quantity,
          previousQuantity,
          newQuantity,
          reason: `بيع سابق رقم #${sale.id}`,
          saleId: sale.id,
          createdAt: sale.createdAt,
        });
        balances.set(productId, newQuantity);
      }
    }
    if (rows.length) await tx.insert(inventoryMovementsTable).values(rows);
  });
  inventoryHistoryReady.add(owner);
}

async function seedDemoData(): Promise<void> {
  const existing = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.ownerId, "demo"))
    .limit(1);
  if (existing.length > 0) {
    await ensureInventoryHistory("demo");
    return;
  }

  const [supplierA, supplierB] = await db
    .insert(suppliersTable)
    .values([
      {
        ownerId: "demo",
        name: "مؤسسة النور للتوريدات",
        phone: "01012345678",
        products: "مواد غذائية، مشروبات",
      },
      {
        ownerId: "demo",
        name: "شركة الأمانة",
        phone: "01123456789",
        products: "منظفات، مستلزمات منزلية",
      },
    ])
    .returning();
  const products = await db
    .insert(productsTable)
    .values([
      {
        ownerId: "demo",
        name: "أرز معبأ 1 كجم",
        category: "مواد غذائية",
        purchasePrice: 27,
        sellingPrice: 32,
        quantity: 42,
        minStock: 10,
        supplierId: supplierA.id,
      },
      {
        ownerId: "demo",
        name: "زيت عباد الشمس 1 لتر",
        category: "مواد غذائية",
        purchasePrice: 58,
        sellingPrice: 66,
        quantity: 7,
        minStock: 12,
        supplierId: supplierA.id,
      },
      {
        ownerId: "demo",
        name: "منظف أرضيات 1 لتر",
        category: "منظفات",
        purchasePrice: 34,
        sellingPrice: 45,
        quantity: 18,
        minStock: 6,
        supplierId: supplierB.id,
      },
      {
        ownerId: "demo",
        name: "شاي أسود 250 جم",
        category: "مشروبات",
        purchasePrice: 39,
        sellingPrice: 48,
        quantity: 5,
        minStock: 8,
        supplierId: supplierA.id,
      },
      {
        ownerId: "demo",
        name: "مناديل ورقية",
        category: "مستلزمات منزلية",
        purchasePrice: 19,
        sellingPrice: 25,
        quantity: 36,
        minStock: 10,
        supplierId: supplierB.id,
      },
    ])
    .returning();

  const saleSeeds = [
    { daysAgo: 0, entries: [[products[0], 2], [products[1], 1]] as const },
    { daysAgo: 1, entries: [[products[2], 1], [products[3], 2], [products[0], 1]] as const },
    { daysAgo: 2, entries: [[products[4], 3], [products[0], 1]] as const },
  ];
  for (const seed of saleSeeds) {
    const lines = seed.entries.map(([product, quantity]) => ({
      product,
      quantity,
      unitPrice: product.sellingPrice,
      unitCost: product.purchasePrice,
      lineTotal: product.sellingPrice * quantity,
    }));
    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const profit = lines.reduce(
      (sum, line) => sum + (line.unitPrice - line.unitCost) * line.quantity,
      0,
    );
    const [sale] = await db
      .insert(salesTable)
      .values({
        ownerId: "demo",
        total,
        profit,
        createdAt: new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000),
      })
      .returning();
    await db.insert(saleItemsTable).values(
      lines.map((line) => ({
        saleId: sale.id,
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitCost: line.unitCost,
        lineTotal: line.lineTotal,
      })),
    );
  }
  await ensureInventoryHistory("demo");
}

router.use(async (req, res, next) => {
  if (req.get("x-tager-demo") === "true") {
    try {
      let seedPromise = demoSeedPromise;
      if (!seedPromise) {
        seedPromise = seedDemoData();
        demoSeedPromise = seedPromise;
      }
      await seedPromise;
      res.locals.ownerId = "demo";
      next();
    } catch (error) {
      req.log.error({ err: error }, "Could not prepare demo data");
      res.status(500).json({ error: "تعذر تحميل البيانات التجريبية" });
    }
    return;
  }

  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }
  res.locals.ownerId = userId;
  await ensureInventoryHistory(userId);
  next();
});

let demoSeedPromise: Promise<void> | null = null;

function ownerId(res: { locals: Record<string, unknown> }): string {
  return String(res.locals.ownerId);
}

async function salesWithLines(
  owner: string,
  limit?: number,
): Promise<
  Array<{
    id: number;
    total: number;
    profit: number;
    createdAt: Date;
    items: Array<{
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      unitCost: number;
    }>;
  }>
> {
  const sales = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.ownerId, owner))
    .orderBy(desc(salesTable.createdAt))
    .limit(limit ?? 100);
  if (!sales.length) return [];
  const lines = await db
    .select()
    .from(saleItemsTable)
    .where(inArray(saleItemsTable.saleId, sales.map((sale) => sale.id)));
  const bySale = new Map<number, typeof lines>();
  for (const line of lines) {
    const existing = bySale.get(line.saleId) ?? [];
    existing.push(line);
    bySale.set(line.saleId, existing);
  }
  return sales.map((sale) => ({
    id: sale.id,
    total: sale.total,
    profit: sale.profit,
    createdAt: sale.createdAt,
    items: (bySale.get(sale.id) ?? []).map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      unitCost: line.unitCost,
    })),
  }));
}

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.ownerId, ownerId(res)))
    .orderBy(productsTable.name);
  res.json(ListProductsResponse.parse(products));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const owner = ownerId(res);
  const supplierId = parsed.data.supplierId ?? null;
  if (supplierId !== null) {
    const [supplier] = await db
      .select({ id: suppliersTable.id })
      .from(suppliersTable)
      .where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.ownerId, owner)));
    if (!supplier) {
      res.status(400).json({ error: "المورد المحدد غير موجود" });
      return;
    }
  }
  const product = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(productsTable)
      .values({ ...parsed.data, supplierId, ownerId: owner })
      .returning();
    if (created.quantity > 0) {
      await tx.insert(inventoryMovementsTable).values({
        ownerId: owner,
        productId: created.id,
        productName: created.name,
        type: "in",
        quantity: created.quantity,
        previousQuantity: 0,
        newQuantity: created.quantity,
        reason: "رصيد افتتاحي عند إنشاء المنتج",
      });
    }
    return created;
  });
  res.status(201).json(CreateProductResponse.parse(product));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    const errorMessage = !params.success
      ? params.error.message
      : !parsed.success
        ? parsed.error.message
        : "بيانات غير صالحة";
    res.status(400).json({ error: errorMessage });
    return;
  }
  const owner = ownerId(res);
  const supplierId = parsed.data.supplierId ?? null;
  if (supplierId !== null) {
    const [supplier] = await db
      .select({ id: suppliersTable.id })
      .from(suppliersTable)
      .where(and(eq(suppliersTable.id, supplierId), eq(suppliersTable.ownerId, owner)));
    if (!supplier) {
      res.status(400).json({ error: "المورد المحدد غير موجود" });
      return;
    }
  }
  const product = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, params.data.id), eq(productsTable.ownerId, owner)))
      .for("update");
    if (!current) return null;
    const [updated] = await tx
      .update(productsTable)
      .set({ ...parsed.data, supplierId })
      .where(and(eq(productsTable.id, params.data.id), eq(productsTable.ownerId, owner)))
      .returning();
    if (current.quantity !== updated.quantity) {
      await tx.insert(inventoryMovementsTable).values({
        ownerId: owner,
        productId: updated.id,
        productName: updated.name,
        type: "adjustment",
        quantity: updated.quantity - current.quantity,
        previousQuantity: current.quantity,
        newQuantity: updated.quantity,
        reason: "تعديل الرصيد من صفحة المنتجات",
      });
    }
    return updated;
  });
  if (!product) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }
  res.json(UpdateProductResponse.parse(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const owner = ownerId(res);
  const [used] = await db
    .select({ id: saleItemsTable.id })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .where(
      and(
        eq(saleItemsTable.productId, params.data.id),
        eq(salesTable.ownerId, owner),
      ),
    )
    .limit(1);
  if (used) {
    res.status(409).json({ error: "لا يمكن حذف منتج مرتبط بمبيعات سابقة" });
    return;
  }
  const [deleted] = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.ownerId, owner)))
    .returning({ id: productsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }
  res.sendStatus(204);
});

router.get("/suppliers", async (_req, res): Promise<void> => {
  const suppliers = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.ownerId, ownerId(res)))
    .orderBy(suppliersTable.name);
  res.json(ListSuppliersResponse.parse(suppliers));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [supplier] = await db
    .insert(suppliersTable)
    .values({ ...parsed.data, ownerId: ownerId(res) })
    .returning();
  res.status(201).json(CreateSupplierResponse.parse(supplier));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse(req.params);
  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    const errorMessage = !params.success
      ? params.error.message
      : !parsed.success
        ? parsed.error.message
        : "بيانات غير صالحة";
    res.status(400).json({ error: errorMessage });
    return;
  }
  const [supplier] = await db
    .update(suppliersTable)
    .set(parsed.data)
    .where(and(eq(suppliersTable.id, params.data.id), eq(suppliersTable.ownerId, ownerId(res))))
    .returning();
  if (!supplier) {
    res.status(404).json({ error: "المورد غير موجود" });
    return;
  }
  res.json(UpdateSupplierResponse.parse(supplier));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [supplier] = await db
    .delete(suppliersTable)
    .where(and(eq(suppliersTable.id, params.data.id), eq(suppliersTable.ownerId, ownerId(res))))
    .returning({ id: suppliersTable.id });
  if (!supplier) {
    res.status(404).json({ error: "المورد غير موجود" });
    return;
  }
  res.sendStatus(204);
});

router.get("/sales", async (req, res): Promise<void> => {
  const parsed = ListSalesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const sales = await salesWithLines(ownerId(res), parsed.data.limit);
  res.json(ListSalesResponse.parse(sales));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const owner = ownerId(res);
  const quantities = new Map<number, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  try {
    const sale = await db.transaction(async (tx) => {
      const saleLines: Array<{
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        unitCost: number;
        previousQuantity: number;
        newQuantity: number;
      }> = [];
      for (const [productId, quantity] of quantities) {
        const [product] = await tx
          .select()
          .from(productsTable)
          .where(and(eq(productsTable.id, productId), eq(productsTable.ownerId, owner)))
          .for("update");
        if (!product) {
          throw new SaleError(400, "أحد المنتجات المحددة غير موجود");
        }
        if (product.quantity < quantity) {
          throw new SaleError(409, `الكمية المتاحة من ${product.name} هي ${product.quantity} فقط`);
        }
        await tx
          .update(productsTable)
          .set({ quantity: product.quantity - quantity })
          .where(and(eq(productsTable.id, productId), eq(productsTable.ownerId, owner)));
        saleLines.push({
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice: product.sellingPrice,
          lineTotal: product.sellingPrice * quantity,
          unitCost: product.purchasePrice,
          previousQuantity: product.quantity,
          newQuantity: product.quantity - quantity,
        });
      }
      const roundMoney = (value: number) => Math.round(value * 100) / 100;
      const total = roundMoney(saleLines.reduce((sum, line) => sum + line.lineTotal, 0));
      const profit = roundMoney(
        saleLines.reduce(
          (sum, line) => sum + (line.unitPrice - line.unitCost) * line.quantity,
          0,
        ),
      );
      const [created] = await tx
        .insert(salesTable)
        .values({ ownerId: owner, total, profit })
        .returning();
      await tx.insert(saleItemsTable).values(
        saleLines.map(({ previousQuantity: _previous, newQuantity: _new, ...line }) => ({
          saleId: created.id,
          ...line,
        })),
      );
      await tx.insert(inventoryMovementsTable).values(
        saleLines.map((line) => ({
          ownerId: owner,
          productId: line.productId,
          productName: line.productName,
          type: "out" as const,
          quantity: line.quantity,
          previousQuantity: line.previousQuantity,
          newQuantity: line.newQuantity,
          reason: `بيع رقم #${created.id}`,
          saleId: created.id,
          createdAt: created.createdAt,
        })),
      );
      return {
        ...created,
        items: saleLines.map(({ previousQuantity: _previous, newQuantity: _new, ...line }) => line),
      };
    });
    res.status(201).json(CreateSaleResponse.parse(sale));
  } catch (error) {
    if (error instanceof SaleError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get("/inventory-movements", async (req, res): Promise<void> => {
  const readDate = (value: unknown): Date | undefined => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return undefined;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return undefined;
    }
    return date;
  };
  const fromValue = req.query.from;
  const toValue = req.query.to;
  const from = fromValue === undefined ? undefined : readDate(fromValue);
  const to = toValue === undefined ? undefined : readDate(toValue);
  if ((fromValue !== undefined && !from) || (toValue !== undefined && !to)) {
    res.status(400).json({ error: "أدخل تاريخاً صالحاً لتصفية الحركات" });
    return;
  }
  const parsed = ListInventoryMovementsQueryParams.safeParse({
    productId: req.query.productId,
    type: req.query.type,
    from,
    to,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) {
    res.status(400).json({ error: "تاريخ البداية يجب أن يسبق تاريخ النهاية" });
    return;
  }
  const conditions = [eq(inventoryMovementsTable.ownerId, ownerId(res))];
  if (parsed.data.productId !== undefined) {
    conditions.push(eq(inventoryMovementsTable.productId, parsed.data.productId));
  }
  if (parsed.data.type) {
    conditions.push(eq(inventoryMovementsTable.type, parsed.data.type));
  }
  if (parsed.data.from) conditions.push(gte(inventoryMovementsTable.createdAt, parsed.data.from));
  if (parsed.data.to) {
    const toExclusive = new Date(parsed.data.to);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    conditions.push(lt(inventoryMovementsTable.createdAt, toExclusive));
  }
  const movements = await db
    .select()
    .from(inventoryMovementsTable)
    .where(and(...conditions))
    .orderBy(desc(inventoryMovementsTable.createdAt), desc(inventoryMovementsTable.id))
    .limit(parsed.data.limit)
    .offset(parsed.data.offset);
  res.json(ListInventoryMovementsResponse.parse(movements));
});

router.post("/inventory-movements", async (req, res): Promise<void> => {
  const parsed = CreateInventoryMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { productId, type, quantity } = parsed.data;
  const reason = parsed.data.reason.trim();
  if (!reason) {
    res.status(400).json({ error: "اكتب سبب حركة المخزون" });
    return;
  }
  if (type !== "adjustment" && quantity < 1) {
    res.status(400).json({ error: "أدخل كمية أكبر من صفر" });
    return;
  }
  const owner = ownerId(res);
  try {
    const movement = await db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.id, productId), eq(productsTable.ownerId, owner)))
        .for("update");
      if (!product) throw new InventoryMovementError(404, "المنتج غير موجود");

      const previousQuantity = product.quantity;
      const newQuantity =
        type === "in"
          ? previousQuantity + quantity
          : type === "out"
            ? previousQuantity - quantity
            : quantity;
      if (type === "out" && quantity > previousQuantity) {
        throw new InventoryMovementError(
          409,
          `الكمية المتاحة من ${product.name} هي ${previousQuantity} فقط`,
        );
      }
      const recordedQuantity =
        type === "adjustment" ? newQuantity - previousQuantity : quantity;
      if (newQuantity < 0) {
        throw new InventoryMovementError(400, "لا يمكن أن يصبح المخزون أقل من صفر");
      }
      if (newQuantity === previousQuantity) {
        throw new InventoryMovementError(400, "الكمية الجديدة مطابقة للكمية الحالية");
      }
      await tx
        .update(productsTable)
        .set({ quantity: newQuantity })
        .where(and(eq(productsTable.id, productId), eq(productsTable.ownerId, owner)));
      const [created] = await tx
        .insert(inventoryMovementsTable)
        .values({
          ownerId: owner,
          productId: product.id,
          productName: product.name,
          type,
          quantity: recordedQuantity,
          previousQuantity,
          newQuantity,
          reason,
        })
        .returning();
      return created;
    });
    res.status(201).json(CreateInventoryMovementResponse.parse(movement));
  } catch (error) {
    if (error instanceof InventoryMovementError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const owner = ownerId(res);
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.ownerId, owner));
  const allSales = await db
    .select({ total: salesTable.total, profit: salesTable.profit })
    .from(salesTable)
    .where(eq(salesTable.ownerId, owner));
  const recentSales = await salesWithLines(owner, 6);
  const lowStockProducts = products.filter((product) => product.quantity <= product.minStock);
  res.json(
    GetDashboardResponse.parse({
      totalSales: allSales.reduce((sum, sale) => sum + sale.total, 0),
      totalProfit: allSales.reduce((sum, sale) => sum + sale.profit, 0),
      productsCount: products.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      recentSales,
    }),
  );
});

router.get("/reports", async (req, res): Promise<void> => {
  const readDate = (value: unknown): Date | null => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === value ? date : null;
  };
  const fromDate = readDate(req.query.from);
  const toDate = readDate(req.query.to);
  if (!fromDate || !toDate) {
    res.status(400).json({ error: "أدخل تاريخ بداية ونهاية صالحين" });
    return;
  }
  const parsed = GetReportsQueryParams.safeParse({
    from: fromDate,
    to: toDate,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.from > parsed.data.to) {
    res.status(400).json({ error: "تاريخ البداية يجب أن يسبق تاريخ النهاية" });
    return;
  }
  const owner = ownerId(res);
  const from = new Date(parsed.data.from);
  const toExclusive = new Date(parsed.data.to);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const matchingSales = await db
    .select()
    .from(salesTable)
    .where(
      and(
        eq(salesTable.ownerId, owner),
        gte(salesTable.createdAt, from),
        lt(salesTable.createdAt, toExclusive),
      ),
    )
    .orderBy(salesTable.createdAt);

  const dailyTotals = new Map<string, { sales: number; profit: number }>();
  const bestSellers = new Map<
    number,
    { productId: number; name: string; quantity: number; revenue: number }
  >();
  let lines: typeof saleItemsTable.$inferSelect[] = [];
  if (matchingSales.length) {
    lines = await db
      .select()
      .from(saleItemsTable)
      .where(inArray(saleItemsTable.saleId, matchingSales.map((sale) => sale.id)));
  }
  for (const sale of matchingSales) {
    const day = sale.createdAt.toISOString().slice(0, 10);
    const current = dailyTotals.get(day) ?? { sales: 0, profit: 0 };
    current.sales += sale.total;
    current.profit += sale.profit;
    dailyTotals.set(day, current);
  }
  for (const line of lines) {
    const current = bestSellers.get(line.productId) ?? {
      productId: line.productId,
      name: line.productName,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += line.quantity;
    current.revenue += line.lineTotal;
    bestSellers.set(line.productId, current);
  }

  const daily: Array<{ date: string; sales: number; profit: number }> = [];
  const day = new Date(parsed.data.from);
  const lastDay = new Date(parsed.data.to);
  while (day <= lastDay) {
    const date = day.toISOString().slice(0, 10);
    const amounts = dailyTotals.get(date) ?? { sales: 0, profit: 0 };
    daily.push({ date, ...amounts });
    day.setUTCDate(day.getUTCDate() + 1);
  }
  res.json(
    GetReportsResponse.parse({
      totalSales: matchingSales.reduce((sum, sale) => sum + sale.total, 0),
      estimatedProfit: matchingSales.reduce((sum, sale) => sum + sale.profit, 0),
      salesCount: matchingSales.length,
      daily,
      bestSellers: [...bestSellers.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
    }),
  );
});

export default router;
