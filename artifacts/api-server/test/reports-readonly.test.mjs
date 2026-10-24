// Verifies current persisted data only. No test sales, schema changes or writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireDb = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = requireDb("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const directory = await mkdtemp(path.join(tmpdir(), "tager-report-check-"));
let client;
try {
  const output = path.join(directory, "analysis.mjs");
  await build({ entryPoints: [path.join(root, "src/lib/sales-analysis.ts")], outfile: output,
    bundle: true, platform: "node", format: "esm", logLevel: "silent" });
  const { analyzeSales, cairoDay, shiftDay, validDay } = await import(pathToFileURL(output));
  assert.equal(validDay("2026-02-30"), false);
  assert.equal(cairoDay(new Date("2026-01-01T22:30:00Z")), "2026-01-02");
  assert.equal(cairoDay(new Date("2026-07-01T21:30:00Z")), "2026-07-02");
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
  client = await pool.connect();
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const { rows: owners } = await client.query("SELECT DISTINCT owner_id FROM tager_sales");
  let scenarios = 0;
  for (const { owner_id: owner } of owners) {
    const { rows } = await client.query(`
      SELECT s.id AS "saleId", to_char(s.created_at AT TIME ZONE 'Africa/Cairo','YYYY-MM-DD') AS day,
        s.total::float8 AS "saleTotal", i.product_id AS "productId", i.product_name AS "productName",
        i.quantity, i.unit_cost::float8 AS "unitCost", i.line_total::float8 AS "lineTotal"
      FROM tager_sales s LEFT JOIN tager_sale_items i ON i.sale_id=s.id
      WHERE s.owner_id=$1 ORDER BY s.created_at,i.id`, [owner]);
    if (!rows.length) continue;
    const today = cairoDay();
    const to = rows.at(-1).day;
    const from = shiftDay(to, -30);
    for (const productId of [null, ...new Set(rows.map(r => r.productId).filter(id => id !== null))]) {
      const selected = productId === null ? rows : rows.filter(r => r.productId === productId);
      const report = analyzeSales(selected, from, to, today);
      const { rows: [expected] } = await client.query(`
        SELECT coalesce(sum(i.line_total),0)::float8 AS revenue,
          coalesce(sum(i.unit_cost*i.quantity),0)::float8 AS cost,
          count(DISTINCT s.id)::int AS count
        FROM tager_sales s JOIN tager_sale_items i ON i.sale_id=s.id
        WHERE s.owner_id=$1 AND (s.created_at AT TIME ZONE 'Africa/Cairo')::date BETWEEN $2::date AND $3::date
          AND ($4::integer IS NULL OR i.product_id=$4)`, [owner, from, to, productId]);
      assert.equal(report.totalSales, expected.revenue);
      assert.equal(report.totalCost, expected.cost);
      assert.equal(report.estimatedProfit, Math.round((expected.revenue - expected.cost) * 100) / 100);
      assert.equal(report.salesCount, expected.count);
      assert.equal(Math.round(report.daily.reduce((sum, d) => sum + d.sales, 0) * 100) / 100, expected.revenue);
      assert.equal(Math.round(report.products.reduce((sum, p) => sum + p.cost, 0) * 100) / 100, expected.cost);
      assert.ok(report.bestSellers.length <= 5);
      const { rows: [previous] } = await client.query(`
        SELECT coalesce(sum(i.line_total),0)::float8 AS revenue
        FROM tager_sales s JOIN tager_sale_items i ON i.sale_id=s.id
        WHERE s.owner_id=$1 AND (s.created_at AT TIME ZONE 'Africa/Cairo')::date BETWEEN $2::date AND $3::date
          AND ($4::integer IS NULL OR i.product_id=$4)`,
        [owner, report.previousFrom, report.previousTo, productId]);
      assert.equal(report.previousSales, previous.revenue);
      assert.equal(report.salesChangePercent, previous.revenue === 0 ? null :
        Math.round((expected.revenue - previous.revenue) / previous.revenue * 10000) / 100);
      for (const [start, end, revenue, count] of [
        [today, today, report.todaySales, report.todayCount],
        [`${today.slice(0, 7)}-01`, today, report.monthSales, report.monthCount],
      ]) {
        const { rows: [value] } = await client.query(`
          SELECT coalesce(sum(i.line_total),0)::float8 AS revenue,count(DISTINCT s.id)::int AS count
          FROM tager_sales s JOIN tager_sale_items i ON i.sale_id=s.id
          WHERE s.owner_id=$1 AND (s.created_at AT TIME ZONE 'Africa/Cairo')::date BETWEEN $2::date AND $3::date
          AND ($4::integer IS NULL OR i.product_id=$4)`, [owner, start, end, productId]);
        assert.equal(revenue, value.revenue); assert.equal(count, value.count);
      }
      scenarios++;
    }
    // Simulate missing metadata in memory only; never invent a replacement cost.
    const one = rows.find(r => r.productId !== null);
    if (one) {
      const incomplete = analyzeSales([{ ...one, unitCost: null }], one.day, one.day, today);
      assert.equal(incomplete.totalCost, null);
      assert.equal(incomplete.estimatedProfit, null);
      assert.equal(incomplete.missingCostLines, 1);
    }
  }
  const empty = analyzeSales([], "2026-01-01", "2026-01-01", "2026-01-01");
  assert.equal(empty.totalSales, 0); assert.equal(empty.salesCount, 0);
  assert.equal(empty.salesChangePercent, null);
  await client.query("ROLLBACK");
  console.log(JSON.stringify({ success: true, ownerGroups: owners.length, dataScenarios: scenarios,
    checks: ["sales/cost/profit vs SQL", "product filters", "distinct sale counts", "daily/product totals",
      "today/month", "equal previous period", "Cairo DST", "empty period", "missing cost stays unknown"],
    databaseWrites: 0 }));
} finally {
  if (client) client.release();
  await pool.end();
  await rm(directory, { recursive: true, force: true });
}
