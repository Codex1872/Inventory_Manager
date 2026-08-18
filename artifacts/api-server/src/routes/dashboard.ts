import { Router, type IRouter } from "express";
import { sql, inArray } from "drizzle-orm";
import {
  db,
  productsTable,
  variantsTable,
  movementsTable,
  socialMessagesTable,
  socialPostsTable,
  categoriesTable,
} from "@workspace/db";
import { getOnHandMap } from "../lib/stock";
import { buildMovementsWithRefs } from "../lib/movements";
import { buildProductDetails } from "../lib/products";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [{ count: productCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);
  const [{ count: variantCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(variantsTable);

  const onHandMap = await getOnHandMap();
  const variants = await db.select().from(variantsTable);
  const products = await db.select().from(productsTable);
  const productPrice = new Map(products.map((p) => [p.id, Number(p.priceHt)]));

  let totalOnHand = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let inventoryValue = 0;

  for (const v of variants) {
    const onHand = onHandMap.get(v.id) ?? 0;
    totalOnHand += onHand;
    if (onHand <= 0) outOfStockCount++;
    else if (onHand <= v.threshold) lowStockCount++;
    inventoryValue += onHand * (productPrice.get(v.productId) ?? 0);
  }

  const [{ count: movementsToday }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(movementsTable)
    .where(sql`${movementsTable.createdAt} >= CURRENT_DATE`);

  const [{ count: unreadMessages }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(socialMessagesTable)
    .where(sql`${socialMessagesTable.unread} = true`);

  const [{ count: scheduledPosts }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(socialPostsTable)
    .where(sql`${socialPostsTable.status} = 'scheduled'`);

  res.json({
    totalProducts: productCount,
    totalVariants: variantCount,
    totalOnHand,
    lowStockCount,
    outOfStockCount,
    movementsToday,
    unreadMessages,
    scheduledPosts,
    inventoryValue: +inventoryValue.toFixed(2),
  });
});

router.get("/dashboard/recent-movements", async (_req, res): Promise<void> => {
  const movements = await buildMovementsWithRefs(undefined, { limit: 12 });
  res.json(movements);
});

router.get("/dashboard/low-stock", async (_req, res): Promise<void> => {
  const onHandMap = await getOnHandMap();
  const variants = await db.select().from(variantsTable);
  const lowVariants = variants.filter((v) => {
    const onHand = onHandMap.get(v.id) ?? 0;
    return onHand <= v.threshold;
  });
  if (lowVariants.length === 0) {
    res.json([]);
    return;
  }
  const productIds = Array.from(new Set(lowVariants.map((v) => v.productId)));
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  const result = lowVariants
    .map((v) => {
      const product = productMap.get(v.productId);
      return {
        variantId: v.id,
        productId: v.productId,
        productName: product?.name ?? "",
        sku: v.sku,
        size: v.size,
        color: v.color,
        onHand: onHandMap.get(v.id) ?? 0,
        threshold: v.threshold,
        productImageUrl: product?.imageUrl ?? null,
      };
    })
    .sort((a, b) => a.onHand - b.onHand);
  res.json(result);
});

router.get("/dashboard/best-sellers", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      productId: variantsTable.productId,
      total: sql<number>`COALESCE(SUM(${movementsTable.quantity}), 0)::int`,
    })
    .from(movementsTable)
    .innerJoin(variantsTable, sql`${variantsTable.id} = ${movementsTable.variantId}`)
    .where(sql`${movementsTable.type} = 'out'`)
    .groupBy(variantsTable.productId)
    .orderBy(sql`COALESCE(SUM(${movementsTable.quantity}), 0) DESC`)
    .limit(8);

  if (rows.length === 0) {
    res.json([]);
    return;
  }
  const products = await buildProductDetails(rows.map((r) => r.productId));
  const result = rows
    .map((r) => {
      const product = products.find((p) => p.id === r.productId);
      if (!product) return null;
      return {
        productId: product.id,
        productName: product.name,
        productImageUrl: product.imageUrl,
        unitsSold: r.total,
        revenue: +(r.total * product.priceTtc).toFixed(2),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  res.json(result);
});

router.get("/dashboard/stock-by-category", async (_req, res): Promise<void> => {
  const onHandMap = await getOnHandMap();
  const products = await db.select().from(productsTable);
  const variants = await db.select().from(variantsTable);
  const categories = await db.select().from(categoriesTable);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const variantsByProduct = new Map<number, typeof variants>();
  for (const v of variants) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const totals = new Map<
    string,
    { categoryId: number | null; categoryName: string; units: number; value: number }
  >();
  for (const p of products) {
    const key = String(p.categoryId ?? "none");
    const existing =
      totals.get(key) ??
      {
        categoryId: p.categoryId,
        categoryName:
          p.categoryId != null
            ? catMap.get(p.categoryId)?.name ?? "Sans catégorie"
            : "Sans catégorie",
        units: 0,
        value: 0,
      };
    const productVariants = variantsByProduct.get(p.id) ?? [];
    const productOnHand = productVariants.reduce(
      (sum, v) => sum + (onHandMap.get(v.id) ?? 0),
      0,
    );
    existing.units += productOnHand;
    existing.value += productOnHand * Number(p.priceHt);
    totals.set(key, existing);
  }

  res.json(
    Array.from(totals.values())
      .sort((a, b) => b.value - a.value)
      .map((t) => ({
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        totalUnits: t.units,
        totalValue: +t.value.toFixed(2),
      })),
  );
});

router.get("/dashboard/movement-trends", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      date: sql<string>`TO_CHAR(${movementsTable.createdAt}, 'YYYY-MM-DD')`,
      type: movementsTable.type,
      qty: sql<number>`SUM(${movementsTable.quantity})::int`,
    })
    .from(movementsTable)
    .where(sql`${movementsTable.createdAt} >= CURRENT_DATE - INTERVAL '13 days'`)
    .groupBy(sql`TO_CHAR(${movementsTable.createdAt}, 'YYYY-MM-DD'), ${movementsTable.type}`);

  const buckets = new Map<string, { inbound: number; outbound: number }>();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { inbound: 0, outbound: 0 });
  }
  for (const r of rows) {
    const bucket = buckets.get(r.date) ?? { inbound: 0, outbound: 0 };
    if (r.type === "in") bucket.inbound += r.qty;
    else if (r.type === "out") bucket.outbound += r.qty;
    buckets.set(r.date, bucket);
  }

  res.json(
    Array.from(buckets.entries()).map(([date, b]) => ({
      date,
      inbound: b.inbound,
      outbound: b.outbound,
    })),
  );
});

export default router;
