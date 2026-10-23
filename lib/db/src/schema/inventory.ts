import {
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  productsTable,
  salesTable,
  suppliersTable,
} from "./tager";

export const inventoryMovementsTable = pgTable(
  "tager_inventory_movements",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    productId: integer("product_id").references(() => productsTable.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    type: text("type", {
      enum: ["opening", "sale", "supply", "adjustment"],
    }).notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    saleId: integer("sale_id").references(() => salesTable.id, {
      onDelete: "set null",
    }),
    supplierId: integer("supplier_id").references(() => suppliersTable.id, {
      onDelete: "set null",
    }),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "tager_inventory_type_allowed",
      sql`${table.type} IN ('opening', 'sale', 'supply', 'adjustment')`,
    ),
    check(
      "tager_inventory_sale_reference_matches_type",
      sql`(${table.type} = 'sale' AND ${table.saleId} IS NOT NULL)
        OR (${table.type} <> 'sale' AND ${table.saleId} IS NULL)`,
    ),
    check(
      "tager_inventory_supply_has_request_id",
      sql`${table.type} <> 'supply' OR ${table.requestId} IS NOT NULL`,
    ),
    check(
      "tager_inventory_opening_starts_at_zero",
      sql`${table.type} <> 'opening' OR ${table.balanceBefore} = 0`,
    ),
    check("tager_inventory_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "tager_inventory_balances_nonnegative",
      sql`${table.balanceBefore} >= 0 AND ${table.balanceAfter} >= 0`,
    ),
    check(
      "tager_inventory_balance_matches_type",
      sql`(${table.type} = 'sale' AND ${table.balanceAfter} = ${table.balanceBefore} - ${table.quantity})
        OR (${table.type} IN ('opening', 'supply') AND ${table.balanceAfter} = ${table.balanceBefore} + ${table.quantity})
        OR (${table.type} = 'adjustment' AND abs(${table.balanceAfter} - ${table.balanceBefore}) = ${table.quantity})`,
    ),
    index("tager_inventory_owner_created_idx").on(table.ownerId, table.createdAt),
    index("tager_inventory_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
    index("tager_inventory_type_created_idx").on(table.ownerId, table.type, table.createdAt),
    uniqueIndex("tager_inventory_sale_product_unique")
      .on(table.saleId, table.productId)
      .where(sql`${table.saleId} IS NOT NULL`),
    uniqueIndex("tager_inventory_opening_product_unique")
      .on(table.ownerId, table.productId)
      .where(sql`${table.type} = 'opening' AND ${table.productId} IS NOT NULL`),
    uniqueIndex("tager_inventory_request_unique")
      .on(table.ownerId, table.requestId)
      .where(sql`${table.requestId} IS NOT NULL`),
  ],
);

export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
