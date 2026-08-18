import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Supplier = typeof suppliersTable.$inferSelect;
