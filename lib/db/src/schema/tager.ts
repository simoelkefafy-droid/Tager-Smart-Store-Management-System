import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const suppliersTable = pgTable("tager_suppliers", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  products: text("products").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productsTable = pgTable("tager_products", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  purchasePrice: numeric("purchase_price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  sellingPrice: numeric("selling_price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  supplierId: integer("supplier_id").references(() => suppliersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const salesTable = pgTable("tager_sales", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  total: numeric("total", { precision: 12, scale: 2, mode: "number" }).notNull(),
  profit: numeric("profit", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const saleItemsTable = pgTable("tager_sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => salesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  unitCost: numeric("unit_cost", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  lineTotal: numeric("line_total", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
});

export const inventoryMovementTypeEnum = pgEnum("tager_inventory_movement_type", [
  "in",
  "out",
  "adjustment",
]);

export const inventoryMovementsTable = pgTable("tager_inventory_movements", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  type: inventoryMovementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  reason: text("reason").notNull(),
  saleId: integer("sale_id").references(() => salesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

