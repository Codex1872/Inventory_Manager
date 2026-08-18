import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import {
  db, cartsTable, cartItemsTable,
  variantsTable, productsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getOnHandMap } from "../lib/stock";

const router: IRouter = Router();

// Récupère ou crée le panier de l'utilisateur connecté
async function getOrCreateCart(userId: number) {
  const [existing] = await db.select().from(cartsTable)
    .where(eq(cartsTable.userId, userId)).limit(1);
  if (existing) return existing;
  const [cart] = await db.insert(cartsTable).values({ userId }).returning();
  return cart;
}

// Construit la réponse panier enrichie (produit + stock)
async function buildCartResponse(cartId: number) {
  const items = await db.select().from(cartItemsTable)
    .where(eq(cartItemsTable.cartId, cartId));

  if (items.length === 0) return { items: [], totalTtc: 0, itemCount: 0 };

  const variantIds = items.map((i) => i.variantId);
  const variants   = await db.select().from(variantsTable)
    .where(inArray(variantsTable.id, variantIds));
  const productIds = Array.from(new Set(variants.map((v) => v.productId)));
  const products   = await db.select().from(productsTable)
    .where(inArray(productsTable.id, productIds));
  const onHandMap  = await getOnHandMap();

  const variantMap  = new Map(variants.map((v) => [v.id, v]));
  const productMap  = new Map(products.map((p) => [p.id, p]));

  const enriched = items.map((item) => {
    const variant = variantMap.get(item.variantId);
    const product = variant ? productMap.get(variant.productId) : undefined;
    const priceHt  = Number(product?.priceHt  ?? 0);
    const vatRate  = Number(product?.vatRate   ?? 20);
    const priceTtc = +(priceHt * (1 + vatRate / 100)).toFixed(2);
    const stock    = onHandMap.get(item.variantId) ?? 0;

    return {
      variantId:   item.variantId,
      quantity:    item.quantity,
      productId:   product?.id ?? 0,
      productName: product?.name ?? "Produit supprimé",
      sku:         variant?.sku ?? "",
      size:        variant?.size ?? null,
      color:       variant?.color ?? null,
      imageUrl:    product?.imageUrl ?? null,
      priceHt,
      priceTtc,
      vatRate,
      stock,
      lineTtc: +(priceTtc * item.quantity).toFixed(2),
    };
  });

  const totalTtc  = +enriched.reduce((s, i) => s + i.lineTtc, 0).toFixed(2);
  const itemCount = enriched.reduce((s, i) => s + i.quantity, 0);

  return { items: enriched, totalTtc, itemCount };
}

// ── GET /cart ──────────────────────────────────────────────────────────────
router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const cart = await getOrCreateCart(req.user!.userId);
  res.json(await buildCartResponse(cart.id));
});

// ── POST /cart/items ── (ajout) ────────────────────────────────────────────
router.post("/cart/items", requireAuth, async (req, res): Promise<void> => {
  const variantId = Number(req.body.variantId);
  const qty       = Math.max(1, Number(req.body.quantity ?? 1));

  if (!Number.isFinite(variantId)) {
    res.status(400).json({ error: "variantId invalide" }); return;
  }

  // Vérifier que la variante existe
  const [variant] = await db.select().from(variantsTable)
    .where(eq(variantsTable.id, variantId)).limit(1);
  if (!variant) { res.status(404).json({ error: "Variante introuvable" }); return; }

  const cart = await getOrCreateCart(req.user!.userId);

  // Upsert : si déjà présent on additionne
  const [existing] = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.variantId, variantId)))
    .limit(1);

  if (existing) {
    await db.update(cartItemsTable)
      .set({ quantity: existing.quantity + qty })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({ cartId: cart.id, variantId, quantity: qty });
  }

  res.status(201).json(await buildCartResponse(cart.id));
});

// ── PUT /cart/items/:variantId ── (mise à jour quantité) ──────────────────
router.put("/cart/items/:variantId", requireAuth, async (req, res): Promise<void> => {
  const variantId = Number(req.params.variantId);
  const qty       = Number(req.body.quantity ?? 1);

  const cart = await getOrCreateCart(req.user!.userId);

  if (qty <= 0) {
    await db.delete(cartItemsTable)
      .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.variantId, variantId)));
  } else {
    await db.update(cartItemsTable)
      .set({ quantity: qty })
      .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.variantId, variantId)));
  }

  res.json(await buildCartResponse(cart.id));
});

// ── DELETE /cart/items/:variantId ─────────────────────────────────────────
router.delete("/cart/items/:variantId", requireAuth, async (req, res): Promise<void> => {
  const variantId = Number(req.params.variantId);
  const cart = await getOrCreateCart(req.user!.userId);
  await db.delete(cartItemsTable)
    .where(and(eq(cartItemsTable.cartId, cart.id), eq(cartItemsTable.variantId, variantId)));
  res.json(await buildCartResponse(cart.id));
});

// ── DELETE /cart ── (vider) ────────────────────────────────────────────────
router.delete("/cart", requireAuth, async (req, res): Promise<void> => {
  const cart = await getOrCreateCart(req.user!.userId);
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));
  res.json({ items: [], totalTtc: 0, itemCount: 0 });
});

export default router;
export { buildCartResponse, getOrCreateCart };
