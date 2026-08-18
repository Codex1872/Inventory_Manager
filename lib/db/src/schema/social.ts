import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const socialAccountsTable = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // facebook | instagram | linkedin | tiktok
  handle: text("handle").notNull(),
  connected: boolean("connected").notNull().default(false),
  followers: integer("followers").notNull().default(0),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

export const socialPostsTable = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  productId: integer("product_id"),
  status: text("status").notNull().default("draft"), // draft | scheduled | published | failed
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  engagementCount: integer("engagement_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const socialMessagesTable = pgTable("social_messages", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  author: text("author").notNull(),
  avatarUrl: text("avatar_url"),
  body: text("body").notNull(),
  kind: text("kind").notNull().default("dm"), // dm | comment | mention
  unread: boolean("unread").notNull().default(true),
  reply: text("reply"),
  replyAt: timestamp("reply_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const socialTriggersTable = pgTable("social_triggers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  event: text("event").notNull(), // new_product | low_stock | restock
  platforms: text("platforms").array().notNull().default([]),
  template: text("template").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SocialAccountRow = typeof socialAccountsTable.$inferSelect;
export type SocialPostRow = typeof socialPostsTable.$inferSelect;
export type SocialMessageRow = typeof socialMessagesTable.$inferSelect;
export type SocialTriggerRow = typeof socialTriggersTable.$inferSelect;
