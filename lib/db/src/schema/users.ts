import { pgEnum, pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "seller", "client"]);

export const usersTable = pgTable("users", {
  id:           serial("id").primaryKey(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name:         text("name").notNull(),
  role:         userRoleEnum("role").notNull().default("client"),
  active:       boolean("active").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
                  .$onUpdate(() => new Date()),
});

export type UserRow = typeof usersTable.$inferSelect;
export type UserRole = "admin" | "seller" | "client";
