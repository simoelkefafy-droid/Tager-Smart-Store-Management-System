import { pgTable, serial, text, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { productsTable, suppliersTable } from "./tager";

export const purchasesTable = pgTable("tager_purchases", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  supplierName: text("supplier_name").notNull(),
  reference: text("reference").notNull().default(""),
  requestId: text("request_id").notNull(),
  total: numeric("total", { precision: 12, scale: 2, mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("tager_purchase_request_unique").on(t.ownerId, t.requestId)]);

export const purchaseItemsTable = pgTable("tager_purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => purchasesTable.id, { onDelete: "restrict" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2, mode: "number" }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2, mode: "number" }).notNull(),
});
