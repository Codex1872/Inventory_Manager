import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const movementsTable = pgTable("movements", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id").notNull(),
  type: text("type").notNull(), // in | out | transfer | adjust
  quantity: integer("quantity").notNull(),
  fromLocationId: integer("from_location_id"),
  toLocationId: integer("to_location_id"),
  operator: text("operator").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MovementRow = typeof movementsTable.$inferSelect;
