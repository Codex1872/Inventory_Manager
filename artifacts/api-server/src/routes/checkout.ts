import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db, cartsTable, cartItemsTable, variantsTable, productsTable,
  onlineOrdersTable, onlineOrderItemsTable, movementsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getOrCreateCart } from "./cart";

const router: IRouter = Router();

let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = new Stripe(key, { apiVersion: "2025-01-27.acacia" });
  return stripeClient;
}

function requireStripe(res: any): Stripe | null {
  const client = getStripe();
  if (!client) {
    res.status(503).json({ error: "Paiement Stripe non configuré (STRIPE_SECRET_KEY manquant)" });
    return null;
  }
  return client;
}

// ── POST /checkout/intent ── crée un PaymentIntent Stripe ─────────────────
router.post("/checkout/intent", requireAuth, async (req, res): Promise<void> => {
  const userId  = req.user!.userId;
  const cart    = await getOrCreateCart(userId);
  const items   = await db.select().from(cartItemsTable)
    .where(eq(cartItemsTable.cartId, cart.id));

  if (items.length === 0) {
    res.status(400).json({ error: "Panier vide" }); return;
  }

  // Enrichir pour calculer le total
  const variantIds = items.map((i) => i.variantId);
  const variants   = await db.select().from(variantsTable)
    .where(inArray(variantsTable.id, variantIds));
  const productIds = Array.from(new Set(variants.map((v) => v.productId)));
  const products   = await db.select().from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalCents = 0;
  for (const item of items) {
    const variant = variantMap.get(item.variantId);
    const product = variant ? productMap.get(variant.productId) : undefined;
    if (!product) continue;
    const priceTtc = Number(product.priceHt) * (1 + Number(product.vatRate) / 100);
    totalCents += Math.round(priceTtc * 100) * item.quantity;
  }

  if (totalCents < 50) {
    res.status(400).json({ error: "Montant trop faible" }); return;
  }

  const client = requireStripe(res);
  if (!client) return;
  const intent = await client.paymentIntents.create({
    amount:   totalCents,
    currency: "eur",
    metadata: { userId: String(userId), cartId: String(cart.id) },
  });

  res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, amountCents: totalCents });
});

// ── POST /checkout/confirm ── valide la commande après paiement ─────────────
router.post("/checkout/confirm", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const {
    paymentIntentId,
    shippingName, shippingAddress, shippingCity,
    shippingPostalCode, shippingCountry,
  } = req.body as Record<string, string>;

  if (!paymentIntentId) {
    res.status(400).json({ error: "paymentIntentId requis" }); return;
  }

  // Vérifier le statut Stripe
  const client = requireStripe(res);
  if (!client) return;
  const intent = await client.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded") {
    res.status(400).json({ error: `Paiement non abouti (statut: ${intent.status})` }); return;
  }

  // Vérifier que c'est bien pour cet utilisateur
  if (intent.metadata.userId !== String(userId)) {
    res.status(403).json({ error: "PaymentIntent invalide" }); return;
  }

  // Récupérer le panier
  const cart  = await getOrCreateCart(userId);
  const items = await db.select().from(cartItemsTable)
    .where(eq(cartItemsTable.cartId, cart.id));

  if (items.length === 0) {
    res.status(400).json({ error: "Panier vide" }); return;
  }

  // Enrichir
  const variantIds = items.map((i) => i.variantId);
  const variants   = await db.select().from(variantsTable)
    .where(inArray(variantsTable.id, variantIds));
  const productIds = Array.from(new Set(variants.map((v) => v.productId)));
  const products   = await db.select().from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  type OrderLine = {
    variantId: number; productName: string; sku: string;
    size: string | null; color: string | null; imageUrl: string | null;
    quantity: number; unitPriceTtc: number; unitPriceHt: number; vatRate: number;
  };
  const lines: OrderLine[] = [];
  let totalHt = 0; let totalTtc = 0;

  for (const item of items) {
    const variant = variantMap.get(item.variantId);
    const product = variant ? productMap.get(variant.productId) : undefined;
    if (!variant || !product) continue;
    const unitPriceHt  = Number(product.priceHt);
    const vatRate      = Number(product.vatRate);
    const unitPriceTtc = +(unitPriceHt * (1 + vatRate / 100)).toFixed(2);
    totalHt  += unitPriceHt  * item.quantity;
    totalTtc += unitPriceTtc * item.quantity;
    lines.push({
      variantId: item.variantId, productName: product.name,
      sku: variant.sku, size: variant.size, color: variant.color,
      imageUrl: product.imageUrl, quantity: item.quantity,
      unitPriceTtc, unitPriceHt, vatRate,
    });
  }

  const reference = `CMD-${Date.now().toString(36).toUpperCase()}`;

  // Créer la commande
  const [order] = await db.insert(onlineOrdersTable).values({
    reference, userId,
    status:                "paid",
    totalHt:               totalHt.toFixed(2),
    totalTtc:              totalTtc.toFixed(2),
    stripePaymentIntentId: paymentIntentId,
    stripeClientSecret:    typeof intent.client_secret === "string" ? intent.client_secret : null,
    shippingName:    shippingName    ?? null,
    shippingAddress: shippingAddress ?? null,
    shippingCity:    shippingCity    ?? null,
    shippingPostalCode: shippingPostalCode ?? null,
    shippingCountry: shippingCountry ?? "FR",
  }).returning();

  // Insérer les lignes
  await db.insert(onlineOrderItemsTable).values(
    lines.map((l) => ({
      orderId: order.id, variantId: l.variantId,
      productName: l.productName, sku: l.sku,
      size: l.size, color: l.color, imageUrl: l.imageUrl,
      quantity: l.quantity,
      unitPriceTtc: l.unitPriceTtc.toFixed(2),
      unitPriceHt:  l.unitPriceHt.toFixed(2),
      vatRate:      l.vatRate.toFixed(2),
    })),
  );

  // Mouvements de stock (sortie)
  await db.insert(movementsTable).values(
    lines.map((l) => ({
      variantId: l.variantId, type: "out" as const,
      quantity:  l.quantity, operator: `client:${userId}`,
      reason:    `Commande en ligne ${reference}`,
    })),
  );

  // Vider le panier
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));

  res.status(201).json({ id: order.id, reference: order.reference, status: order.status,
    totalHt: +totalHt.toFixed(2), totalTtc: +totalTtc.toFixed(2),
    createdAt: order.createdAt, items: lines });
});

// ── GET /orders/me ── historique commandes du client ─────────────────────
router.get("/orders/me", requireAuth, async (req, res): Promise<void> => {
  const orders = await db.select().from(onlineOrdersTable)
    .where(eq(onlineOrdersTable.userId, req.user!.userId))
    .orderBy(desc(onlineOrdersTable.createdAt)).limit(50);

  if (orders.length === 0) { res.json([]); return; }

  const orderIds = orders.map((o) => o.id);
  const items    = await db.select().from(onlineOrderItemsTable)
    .where(inArray(onlineOrderItemsTable.orderId, orderIds));

  const itemsByOrder = new Map<number, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  res.json(orders.map((o) => ({
    id: o.id, reference: o.reference, status: o.status,
    totalHt: Number(o.totalHt), totalTtc: Number(o.totalTtc),
    createdAt: o.createdAt,
    items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
      productName: i.productName, sku: i.sku, size: i.size, color: i.color,
      imageUrl: i.imageUrl, quantity: i.quantity,
      unitPriceTtc: Number(i.unitPriceTtc),
    })),
  })));
});

// ── Webhook Stripe (pour confirmations asynchrones) ───────────────────────
router.post("/webhook/stripe",
  // Le body doit être raw buffer pour la vérification de signature
  (req, _res, next) => { (req as unknown as { rawBody?: Buffer }).rawBody = req.body; next(); },
  async (req, res): Promise<void> => {
    const sig     = req.headers["stripe-signature"] as string;
    const secret  = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) { res.json({ received: true }); return; }

    let event: Stripe.Event;
    const client = getStripe();
    if (!client) { res.json({ received: true }); return; }
    try {
      event = client.webhooks.constructEvent(
        (req as unknown as { rawBody?: Buffer }).rawBody ?? req.body,
        sig, secret,
      );
    } catch {
      res.status(400).json({ error: "Webhook signature invalide" }); return;
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await db.update(onlineOrdersTable)
        .set({ status: "paid" })
        .where(eq(onlineOrdersTable.stripePaymentIntentId, intent.id));
    }

    res.json({ received: true });
  },
);

export default router;
