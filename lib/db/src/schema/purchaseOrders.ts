import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  supplierId: integer("supplier_id").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | received | cancelled
  notes: text("notes"),
  expectedAt: timestamp("expected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  variantId: integer("variant_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceHt: numeric("unit_price_ht", { precision: 12, scale: 2 }).notNull(),
});

export type PurchaseOrderRow = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderItemRow = typeof purchaseOrderItemsTable.$inferSelect;
