import { Router } from "express";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable } from "@workspace/db";
import { GetReportsQueryParams, GetReportsResponse } from "@workspace/api-zod";
import { analyzeSales, cairoDay, shiftDay, validDay } from "../lib/sales-analysis";

const router = Router();
router.get("/reports", async (req, res): Promise<void> => {
  const { from, to } = req.query;
  if (!validDay(from) || !validDay(to) || from > to) {
    res.status(400).json({ error: "أدخل فترة صحيحة؛ تاريخ البداية يجب ألا يتجاوز النهاية." }); return;
  }
  const parsed = GetReportsQueryParams.safeParse({
    ...req.query,
    from: new Date(`${from}T00:00:00Z`),
    to: new Date(`${to}T00:00:00Z`),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "معرّف المنتج أو الفترة غير صالح." }); return;
  }
  const dayCount = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (dayCount > 366) {
    res.status(400).json({ error: "اختر فترة لا تتجاوز 366 يومًا لتظل التقارير سريعة وواضحة." }); return;
  }
  const today = cairoDay(), previousFrom = shiftDay(from, -dayCount);
  const localDay = sql<string>`to_char(${salesTable.createdAt} AT TIME ZONE 'Africa/Cairo', 'YYYY-MM-DD')`;
  const rows = await db.select({
    saleId: salesTable.id, day: localDay, saleTotal: salesTable.total,
    productId: saleItemsTable.productId, productName: saleItemsTable.productName,
    quantity: saleItemsTable.quantity, unitCost: saleItemsTable.unitCost, lineTotal: saleItemsTable.lineTotal,
  }).from(salesTable).leftJoin(saleItemsTable, eq(saleItemsTable.saleId, salesTable.id))
    .where(and(
      eq(salesTable.ownerId, String(res.locals.ownerId)),
      parsed.data.productId === undefined ? undefined : eq(saleItemsTable.productId, parsed.data.productId),
      or(
        and(gte(localDay, previousFrom), lte(localDay, to)),
        and(gte(localDay, `${today.slice(0, 7)}-01`), lte(localDay, today)),
      ),
    )).orderBy(salesTable.createdAt, saleItemsTable.id);
  res.json(GetReportsResponse.parse(analyzeSales(rows, from, to, today)));
});
export default router;
