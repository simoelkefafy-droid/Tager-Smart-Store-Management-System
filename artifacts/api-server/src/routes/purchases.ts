import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, productsTable, suppliersTable, purchasesTable, purchaseItemsTable, inventoryMovementsTable } from "@workspace/db";
import { CreatePurchaseBody, CreatePurchaseResponse, ListPurchasesResponse } from "@workspace/api-zod";

const router = Router();
class PurchaseError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const cents = (value: number) => Math.round(value * 100);
const MAX_MONEY_CENTS = 999999999999;

router.get("/purchases", async (_req, res): Promise<void> => {
  const purchases = await db.select().from(purchasesTable)
    .where(eq(purchasesTable.ownerId, String(res.locals.ownerId)))
    .orderBy(desc(purchasesTable.createdAt), desc(purchasesTable.id));
  const lines = purchases.length
    ? await db.select().from(purchaseItemsTable).where(inArray(purchaseItemsTable.purchaseId, purchases.map(p => p.id)))
    : [];
  res.json(ListPurchasesResponse.parse(purchases.map(p => ({ ...p, items: lines.filter(i => i.purchaseId === p.id) }))));
});

router.post("/purchases", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "راجع المورد والأصناف والكميات وأسعار الشراء (منزلتان عشريتان كحد أقصى)." });
    return;
  }
  const owner = String(res.locals.ownerId);
  const input = parsed.data;
  const reference = input.reference?.trim() ?? "";
  const ordered = [...input.items].sort((a, b) => a.productId - b.productId);
  if (new Set(ordered.map(i => i.productId)).size !== ordered.length) {
    res.status(400).json({ error: "اجمع كمية المنتج في سطر واحد دون تكرار." });
    return;
  }
  try {
    const purchase = await db.transaction(async tx => {
      // Serialize retries before checking the id, including requests on different products.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${owner + ":purchase:" + input.requestId}))`);
      const [existing] = await tx.select().from(purchasesTable)
        .where(and(eq(purchasesTable.ownerId, owner), eq(purchasesTable.requestId, input.requestId)));
      if (existing) {
        const items = await tx.select().from(purchaseItemsTable).where(eq(purchaseItemsTable.purchaseId, existing.id))
          .orderBy(purchaseItemsTable.productId);
        if (existing.supplierId !== input.supplierId || existing.reference !== reference ||
          items.length !== ordered.length || items.some((item, i) =>
            item.productId !== ordered[i].productId || item.quantity !== ordered[i].quantity ||
            cents(item.unitCost) !== cents(ordered[i].unitCost))) {
          throw new PurchaseError(409, "معرّف الطلب مستخدم لفاتورة مختلفة؛ ابدأ فاتورة جديدة.");
        }
        return { ...existing, items };
      }
      const [supplier] = await tx.select().from(suppliersTable)
        .where(and(eq(suppliersTable.id, input.supplierId), eq(suppliersTable.ownerId, owner))).for("share");
      if (!supplier) throw new PurchaseError(400, "المورد غير موجود في متجرك.");
      const totalCents = ordered.reduce((sum, item) => sum + cents(item.unitCost) * item.quantity, 0);
      if (!Number.isSafeInteger(totalCents) || totalCents > MAX_MONEY_CENTS) throw new PurchaseError(400, "إجمالي الفاتورة يتجاوز الحد المسموح.");
      const [created] = await tx.insert(purchasesTable).values({
        ownerId: owner, supplierId: supplier.id, supplierName: supplier.name,
        reference, requestId: input.requestId, total: totalCents / 100,
      }).returning();
      const rows: Array<typeof purchaseItemsTable.$inferInsert> = [];
      for (const item of ordered) {
        const [product] = await tx.select().from(productsTable)
          .where(and(eq(productsTable.id, item.productId), eq(productsTable.ownerId, owner))).for("update");
        if (!product) throw new PurchaseError(400, "أحد المنتجات غير موجود في متجرك.");
        const balanceAfter = product.quantity + item.quantity;
        if (balanceAfter > 2147483647) throw new PurchaseError(400, "الكمية تتجاوز الحد المسموح.");
        const averageCost = Math.round(
          (cents(product.purchasePrice) * product.quantity + cents(item.unitCost) * item.quantity) / balanceAfter
        ) / 100;
        await tx.update(productsTable).set({ quantity: balanceAfter, purchasePrice: averageCost, supplierId: supplier.id })
          .where(and(eq(productsTable.id, product.id), eq(productsTable.ownerId, owner)));
        rows.push({
          purchaseId: created.id, productId: product.id, productName: product.name,
          quantity: item.quantity, unitCost: item.unitCost, lineTotal: cents(item.unitCost) * item.quantity / 100,
        });
        await tx.insert(inventoryMovementsTable).values({
          ownerId: owner, productId: product.id, productName: product.name, type: "supply",
          quantity: item.quantity, reason: `استلام مشتريات رقم ${created.id}${reference ? ` — ${reference}` : ""}`,
          balanceBefore: product.quantity, balanceAfter, supplierId: supplier.id,
          requestId: `purchase:${created.id}:product:${product.id}`,
        });
      }
      const items = await tx.insert(purchaseItemsTable).values(rows).returning();
      return { ...created, items };
    });
    res.status(201).json(CreatePurchaseResponse.parse(purchase));
  } catch (error) {
    if (error instanceof PurchaseError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

export default router;
