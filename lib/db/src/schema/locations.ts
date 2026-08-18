import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const locationsTable = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  zone: text("zone"),
  aisle: text("aisle"),
  shelf: text("shelf"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Location = typeof locationsTable.$inferSelect;
