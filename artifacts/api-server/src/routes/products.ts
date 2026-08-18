import { Router, type IRouter } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db, productsTable, variantsTable, movementsTable } from "@workspace/db";
import { buildProductDetails, buildSingleProductDetail } from "../lib/products";

const router: IRouter = Router();

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.get("/products", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : null;
  const categoryId =
    typeof req.query.categoryId === "string"
      ? Number(req.query.categoryId)
      : null;
  const visible =
    typeof req.query.visible === "string"
      ? req.query.visible === "true"
      : null;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(productsTable.name, `%${search}%`),
        ilike(productsTable.reference, `%${search}%`),
      ),
    );
  }
  if (categoryId !== null && !Number.isNaN(categoryId)) {
    conditions.push(eq(productsTable.categoryId, categoryId));
  }
  if (visible !== null) {
    conditions.push(eq(productsTable.visibleOnStorefront, visible));
  }

  const baseQuery = db
    .select({ id: productsTable.id })
    .from(productsTable)
    .orderBy(sql`${productsTable.createdAt} DESC`);

  const ids = conditions.length
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;
  const details = await buildProductDetails(ids.map((r) => r.id));
  res.json(details);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const product = await buildSingleProductDetail(id);
  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }
  res.json(product);
});

router.post("/products", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const reference =
    typeof body.reference === "string" ? body.reference.trim() : "";
  if (!name || !reference) {
    res.status(400).json({ error: "Nom et référence requis" });
    return;
  }
  const priceHt = Number(body.priceHt ?? 0);
  const vatRate = Number(body.vatRate ?? 20);
  const description =
    typeof body.description === "string" ? body.description : null;
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
  const gallery = Array.isArray(body.gallery)
    ? body.gallery.filter((v): v is string => typeof v === "string")
    : [];
  const categoryId =
    typeof body.categoryId === "number" ? body.categoryId : null;
  const supplierId =
    typeof body.supplierId === "number" ? body.supplierId : null;
  const visibleOnStorefront =
    typeof body.visibleOnStorefront === "boolean"
      ? body.visibleOnStorefront
      : true;

  const [product] = await db
    .insert(productsTable)
    .values({
      name,
      reference,
      description,
      priceHt: priceHt.toFixed(2),
      vatRate: vatRate.toFixed(2),
      imageUrl,
      gallery,
      categoryId,
      supplierId,
      visibleOnStorefront,
    })
    .returning();

  const firstVariant = body.firstVariant as Record<string, unknown> | undefined;
  if (firstVariant && typeof firstVariant.sku === "string") {
    const [variant] = await db
      .insert(variantsTable)
      .values({
        productId: product.id,
        sku: firstVariant.sku,
        barcode:
          typeof firstVariant.barcode === "string"
            ? firstVariant.barcode
            : null,
        size:
          typeof firstVariant.size === "string" ? firstVariant.size : null,
        color:
          typeof firstVariant.color === "string" ? firstVariant.color : null,
        threshold:
          typeof firstVariant.threshold === "number"
            ? firstVariant.threshold
            : 5,
      })
      .returning();
    const initialQty = Number(firstVariant.initialQuantity ?? 0);
    const locId =
      typeof firstVariant.locationId === "number"
        ? firstVariant.locationId
        : null;
    if (initialQty > 0) {
      await db.insert(movementsTable).values({
        variantId: variant.id,
        type: "in",
        quantity: initialQty,
        toLocationId: locId,
        operator: "Système",
        reason: "Stock initial",
      });
    }
  }

  const detail = await buildSingleProductDetail(product.id);
  res.status(201).json(detail);
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.reference === "string") update.reference = body.reference;
  if (typeof body.description === "string" || body.description === null)
    update.description = body.description;
  if (typeof body.priceHt === "number")
    update.priceHt = body.priceHt.toFixed(2);
  if (typeof body.vatRate === "number")
    update.vatRate = body.vatRate.toFixed(2);
  if (typeof body.imageUrl === "string" || body.imageUrl === null)
    update.imageUrl = body.imageUrl;
  if (Array.isArray(body.gallery))
    update.gallery = body.gallery.filter((v): v is string => typeof v === "string");
  if (typeof body.categoryId === "number" || body.categoryId === null)
    update.categoryId = body.categoryId;
  if (typeof body.supplierId === "number" || body.supplierId === null)
    update.supplierId = body.supplierId;
  if (typeof body.visibleOnStorefront === "boolean")
    update.visibleOnStorefront = body.visibleOnStorefront;
  update.updatedBy = "Admin";

  await db.update(productsTable).set(update).where(eq(productsTable.id, id));
  const detail = await buildSingleProductDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }
  res.json(detail);
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.sendStatus(204);
});

router.post("/products/:id/variants", async (req, res): Promise<void> => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  if (typeof body.sku !== "string") {
    res.status(400).json({ error: "SKU requis" });
    return;
  }
  const [variant] = await db
    .insert(variantsTable)
    .values({
      productId,
      sku: body.sku,
      barcode: typeof body.barcode === "string" ? body.barcode : null,
      size: typeof body.size === "string" ? body.size : null,
      color: typeof body.color === "string" ? body.color : null,
      threshold: typeof body.threshold === "number" ? body.threshold : 5,
    })
    .returning();

  const initialQty = Number(body.initialQuantity ?? 0);
  const locId = typeof body.locationId === "number" ? body.locationId : null;
  if (initialQty > 0) {
    await db.insert(movementsTable).values({
      variantId: variant.id,
      type: "in",
      quantity: initialQty,
      toLocationId: locId,
      operator: "Système",
      reason: "Stock initial",
    });
  }

  res.status(201).json({
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    barcode: variant.barcode,
    size: variant.size,
    color: variant.color,
    threshold: variant.threshold,
    onHand: initialQty,
    createdAt: variant.createdAt.toISOString(),
  });
});

router.patch("/variants/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (typeof body.sku === "string") update.sku = body.sku;
  if (typeof body.barcode === "string" || body.barcode === null)
    update.barcode = body.barcode;
  if (typeof body.size === "string" || body.size === null)
    update.size = body.size;
  if (typeof body.color === "string" || body.color === null)
    update.color = body.color;
  if (typeof body.threshold === "number") update.threshold = body.threshold;

  const [variant] = await db
    .update(variantsTable)
    .set(update)
    .where(eq(variantsTable.id, id))
    .returning();
  if (!variant) {
    res.status(404).json({ error: "Variante introuvable" });
    return;
  }
  const onHand = await (await import("../lib/stock")).getOnHandForVariant(id);
  res.json({
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    barcode: variant.barcode,
    size: variant.size,
    color: variant.color,
    threshold: variant.threshold,
    onHand,
    createdAt: variant.createdAt.toISOString(),
  });
});

router.delete("/variants/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(variantsTable).where(eq(variantsTable.id, id));
  res.sendStatus(204);
});

export { toSlug };
export default router;
