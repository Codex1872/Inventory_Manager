import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  movementsTable,
  variantsTable,
  productsTable,
  locationsTable,
} from "@workspace/db";

export type MovementWithRefs = {
  id: number;
  type: "in" | "out" | "transfer" | "adjust";
  variantId: number;
  sku: string;
  productId: number;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  fromLocationId: number | null;
  fromLocationName: string | null;
  toLocationId: number | null;
  toLocationName: string | null;
  operator: string;
  reason: string | null;
  createdAt: string;
};

export async function buildMovementsWithRefs(
  movementIds?: number[],
  filter?: { variantId?: number; type?: string; limit?: number },
): Promise<MovementWithRefs[]> {
  let query = db.select().from(movementsTable).$dynamic();
  if (movementIds && movementIds.length > 0) {
    query = query.where(inArray(movementsTable.id, movementIds));
  } else {
    if (filter?.variantId !== undefined) {
      query = query.where(eq(movementsTable.variantId, filter.variantId));
    }
    if (filter?.type) {
      query = query.where(eq(movementsTable.type, filter.type));
    }
  }
  query = query.orderBy(desc(movementsTable.createdAt));
  if (filter?.limit) {
    query = query.limit(filter.limit);
  }

  const movements = await query;
  if (movements.length === 0) return [];

  const variantIds = Array.from(new Set(movements.map((m) => m.variantId)));
  const variants = await db
    .select()
    .from(variantsTable)
    .where(inArray(variantsTable.id, variantIds));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const productIds = Array.from(new Set(variants.map((v) => v.productId)));
  const products = productIds.length
    ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const locIds = Array.from(
    new Set(
      movements
        .flatMap((m) => [m.fromLocationId, m.toLocationId])
        .filter((v): v is number => v !== null),
    ),
  );
  const locs = locIds.length
    ? await db.select().from(locationsTable).where(inArray(locationsTable.id, locIds))
    : [];
  const locMap = new Map(locs.map((l) => [l.id, l]));

  return movements.map((m) => {
    const variant = variantMap.get(m.variantId);
    const product = variant ? productMap.get(variant.productId) : undefined;
    return {
      id: m.id,
      type: m.type as MovementWithRefs["type"],
      variantId: m.variantId,
      sku: variant?.sku ?? "",
      productId: variant?.productId ?? 0,
      productName: product?.name ?? "Produit supprimé",
      productImageUrl: product?.imageUrl ?? null,
      quantity: m.quantity,
      fromLocationId: m.fromLocationId,
      fromLocationName: m.fromLocationId
        ? locMap.get(m.fromLocationId)?.name ?? null
        : null,
      toLocationId: m.toLocationId,
      toLocationName: m.toLocationId
        ? locMap.get(m.toLocationId)?.name ?? null
        : null,
      operator: m.operator,
      reason: m.reason,
      createdAt: m.createdAt.toISOString(),
    };
  });
}
