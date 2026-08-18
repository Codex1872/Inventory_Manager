import { integer, numeric, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const onlineOrderStatusEnum = pgEnum("online_order_status", [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const onlineOrdersTable = pgTable("online_orders", {
  id:                    serial("id").primaryKey(),
  reference:             text("reference").notNull().unique(),
  userId:                integer("user_id").notNull(),
  status:                onlineOrderStatusEnum("status").notNull().default("pending_payment"),
  totalHt:               numeric("total_ht",  { precision: 12, scale: 2 }).notNull(),
  totalTtc:              numeric("total_ttc", { precision: 12, scale: 2 }).notNull(),
  // Stripe
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeClientSecret:    text("stripe_client_secret"),
  // Livraison
  shippingName:          text("shipping_name"),
  shippingAddress:       text("shipping_address"),
  shippingCity:          text("shipping_city"),
  shippingPostalCode:    text("shipping_postal_code"),
  shippingCountry:       text("shipping_country").default("FR"),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
                           .$onUpdate(() => new Date()),
});

export const onlineOrderItemsTable = pgTable("online_order_items", {
  id:           serial("id").primaryKey(),
  orderId:      integer("order_id").notNull(),
  variantId:    integer("variant_id").notNull(),
  productName:  text("product_name").notNull(),
  sku:          text("sku").notNull(),
  size:         text("size"),
  color:        text("color"),
  imageUrl:     text("image_url"),
  quantity:     integer("quantity").notNull(),
  unitPriceTtc: numeric("unit_price_ttc", { precision: 12, scale: 2 }).notNull(),
  unitPriceHt:  numeric("unit_price_ht",  { precision: 12, scale: 2 }).notNull(),
  vatRate:      numeric("vat_rate",       { precision: 5,  scale: 2 }).notNull(),
});

export type OnlineOrderRow     = typeof onlineOrdersTable.$inferSelect;
export type OnlineOrderItemRow = typeof onlineOrderItemsTable.$inferSelect;
export type OnlineOrderStatus  = typeof onlineOrderStatusEnum.enumValues[number];
