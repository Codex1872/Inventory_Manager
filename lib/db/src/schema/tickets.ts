import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const ticketTemplatesTable = pgTable("ticket_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  width: text("width").notNull().default("80mm"), // 58mm | 80mm
  body: text("body").notNull(),
  kind: text("kind").notNull().default("movement"), // movement | inventory | order
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const printersTable = pgTable("printers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  connection: text("connection").notNull(), // network | bluetooth
  address: text("address").notNull(),
  width: text("width").notNull().default("80mm"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TicketTemplateRow = typeof ticketTemplatesTable.$inferSelect;
export type PrinterRow = typeof printersTable.$inferSelect;
