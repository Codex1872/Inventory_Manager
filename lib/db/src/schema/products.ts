import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  reference: text("reference").notNull().unique(),
  description: text("description"),
  priceHt: numeric("price_ht", { precision: 12, scale: 2 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("20.00"),
  imageUrl: text("image_url"),
  gallery: text("gallery").array().notNull().default([]),
  categoryId: integer("category_id"),
  supplierId: integer("supplier_id"),
  visibleOnStorefront: boolean("visible_on_storefront")
    .notNull()
    .default(true),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProductRow = typeof productsTable.$inferSelect;
