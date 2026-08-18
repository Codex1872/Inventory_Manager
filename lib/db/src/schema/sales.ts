import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Entête d'une vente (ticket de caisse)
export const salesTable = pgTable("sales", {
  id:        serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  cashier:   text("cashier").notNull().default("Admin"),
  totalHt:   numeric("total_ht",  { precision: 12, scale: 2 }).notNull(),
  totalTtc:  numeric("total_ttc", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Lignes du ticket
export const saleItemsTable = pgTable("sale_items", {
  id:           serial("id").primaryKey(),
  saleId:       integer("sale_id").notNull(),
  variantId:    integer("variant_id").notNull(),
  productName:  text("product_name").notNull(),
  sku:          text("sku").notNull(),
  size:         text("size"),
  color:        text("color"),
  quantity:     integer("quantity").notNull(),
  unitPriceHt:  numeric("unit_price_ht",  { precision: 12, scale: 2 }).notNull(),
  unitPriceTtc: numeric("unit_price_ttc", { precision: 12, scale: 2 }).notNull(),
  vatRate:      numeric("vat_rate",       { precision: 5,  scale: 2 }).notNull(),
});

export type SaleRow     = typeof salesTable.$inferSelect;
export type SaleItemRow = typeof saleItemsTable.$inferSelect;
