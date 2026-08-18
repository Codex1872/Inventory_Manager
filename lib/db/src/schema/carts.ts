import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

// Panier (un par utilisateur connecté, ou par sessionId pour les guests)
export const cartsTable = pgTable("carts", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id"),       // null = guest
  sessionId: text("session_id"),       // pour les guests
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
               .$onUpdate(() => new Date()),
});

export const cartItemsTable = pgTable("cart_items", {
  id:        serial("id").primaryKey(),
  cartId:    integer("cart_id").notNull(),
  variantId: integer("variant_id").notNull(),
  quantity:  integer("quantity").notNull().default(1),
  addedAt:   timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqCartVariant: unique().on(t.cartId, t.variantId),
}));

export type CartRow     = typeof cartsTable.$inferSelect;
export type CartItemRow = typeof cartItemsTable.$inferSelect;
