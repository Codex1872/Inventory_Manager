import { Router, type IRouter } from "express";
import { db, variantsTable, productsTable, locationsTable } from "@workspace/db";
import { getOnHandPerLocation } from "../lib/stock";

const router: IRouter = Router();

router.get("/stock", async (req, res): Promise<void> => {
  const locationId =
    typeof req.query.locationId === "string"
      ? Number(req.query.locationId)
      : null;
  const lowOnly =
    typeof req.query.lowOnly === "string" ? req.query.lowOnly === "true" : false;

  const variants = await db.select().from(variantsTable);
  const products = await db.select().from(productsTable);
  const locations = await db.select().from(locationsTable);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  const onHandMap = await getOnHandPerLocation();

  const rows: Array<{
    variantId: number;
    sku: string;
    productId: number;
    productName: string;
    productImageUrl: string | null;
    size: string | null;
    color: string | null;
    locationId: number | null;
    locationName: string | null;
    onHand: number;
    threshold: number;
  }> = [];

  for (const v of variants) {
    const product = productMap.get(v.productId);
    if (!product) continue;
    // Aggregate by location
    const matchedLocations = new Set<number | null>();
    for (const key of onHandMap.keys()) {
      const [vid, lid] = key.split(":");
      if (Number(vid) === v.id) {
        matchedLocations.add(lid === "null" ? null : Number(lid));
      }
    }
    if (matchedLocations.size === 0) {
      matchedLocations.add(null);
    }
    for (const lid of matchedLocations) {
      const onHand = onHandMap.get(`${v.id}:${lid ?? "null"}`) ?? 0;
      if (locationId !== null && !Number.isNaN(locationId) && lid !== locationId)
        continue;
      if (lowOnly && onHand > v.threshold) continue;
      rows.push({
        variantId: v.id,
        sku: v.sku,
        productId: v.productId,
        productName: product.name,
        productImageUrl: product.imageUrl,
        size: v.size,
        color: v.color,
        locationId: lid,
        locationName: lid != null ? locationMap.get(lid)?.name ?? null : null,
        onHand,
        threshold: v.threshold,
      });
    }
  }

  rows.sort((a, b) => a.productName.localeCompare(b.productName));
  res.json(rows);
});

export default router;
