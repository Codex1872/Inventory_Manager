import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const variantsTable = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  size: text("size"),
  color: text("color"),
  threshold: integer("threshold").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VariantRow = typeof variantsTable.$inferSelect;
