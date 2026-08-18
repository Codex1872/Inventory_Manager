import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  bannersTable,
  socialPostsTable,
  contactMessagesTable,
} from "@workspace/db";
import { buildProductDetails, buildSingleProductDetail } from "../lib/products";

const router: IRouter = Router();

router.get("/storefront/products", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : null;
  const categoryId =
    typeof req.query.categoryId === "string"
      ? Number(req.query.categoryId)
      : null;
  const maxPrice =
    typeof req.query.maxPrice === "string"
      ? Number(req.query.maxPrice)
      : null;
  const inStockOnly =
    typeof req.query.inStockOnly === "string"
      ? req.query.inStockOnly === "true"
      : false;

  const conditions = [eq(productsTable.visibleOnStorefront, true)];
  if (search) {
    conditions.push(ilike(productsTable.name, `%${search}%`));
  }
  if (categoryId !== null && !Number.isNaN(categoryId)) {
    conditions.push(eq(productsTable.categoryId, categoryId));
  }

  const rows = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(sql`${productsTable.createdAt} DESC`);

  const details = await buildProductDetails(rows.map((r) => r.id));
  let result = details.map((d) => ({
    id: d.id,
    name: d.name,
    reference: d.reference,
    description: d.description,
    priceTtc: d.priceTtc,
    imageUrl: d.imageUrl,
    categoryName: d.categoryName,
    inStock: d.totalOnHand > 0,
    totalOnHand: d.totalOnHand,
  }));
  if (maxPrice !== null && !Number.isNaN(maxPrice)) {
    result = result.filter((p) => p.priceTtc <= maxPrice);
  }
  if (inStockOnly) {
    result = result.filter((p) => p.inStock);
  }
  res.json(result);
});

router.get("/storefront/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const detail = await buildSingleProductDetail(id);
  if (!detail || !detail.visibleOnStorefront) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }
  res.json({
    id: detail.id,
    name: detail.name,
    reference: detail.reference,
    description: detail.description,
    priceHt: detail.priceHt,
    priceTtc: detail.priceTtc,
    vatRate: detail.vatRate,
    imageUrl: detail.imageUrl,
    gallery: detail.gallery,
    categoryName: detail.categoryName,
    inStock: detail.totalOnHand > 0,
    totalOnHand: detail.totalOnHand,
    variants: detail.variants,
  });
});

router.get("/storefront/banners", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(bannersTable)
    .where(eq(bannersTable.active, true))
    .orderBy(desc(bannersTable.createdAt));
  res.json(
    rows.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      startsAt: b.startsAt ? b.startsAt.toISOString() : null,
      endsAt: b.endsAt ? b.endsAt.toISOString() : null,
      active: b.active,
      createdAt: b.createdAt.toISOString(),
    })),
  );
});

router.get("/storefront/feed", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(socialPostsTable)
    .where(eq(socialPostsTable.status, "published"))
    .orderBy(desc(socialPostsTable.publishedAt))
    .limit(8);
  res.json(
    rows.map((p) => ({
      id: p.id,
      platform: p.platform as "facebook" | "instagram" | "linkedin" | "tiktok",
      message: p.message,
      imageUrl: p.imageUrl,
      productId: p.productId,
      productName: null,
      status: "published" as const,
      scheduledFor: p.scheduledFor ? p.scheduledFor.toISOString() : null,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      engagementCount: p.engagementCount,
      createdAt: p.createdAt.toISOString(),
    })),
  );
});

router.post("/storefront/contact", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.message !== "string"
  ) {
    res.status(400).json({ error: "Tous les champs sont requis" });
    return;
  }
  const [created] = await db
    .insert(contactMessagesTable)
    .values({
      name: body.name,
      email: body.email,
      message: body.message,
    })
    .returning();
  res.status(201).json({
    id: created.id,
    name: created.name,
    email: created.email,
    message: created.message,
    createdAt: created.createdAt.toISOString(),
  });
});

export default router;
