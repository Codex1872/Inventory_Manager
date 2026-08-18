import { eq, inArray } from "drizzle-orm";
import {
  db,
  productsTable,
  variantsTable,
  categoriesTable,
  suppliersTable,
} from "@workspace/db";
import { getOnHandMap } from "./stock";

export type ProductWithDetails = {
  id: number;
  name: string;
  reference: string;
  description: string | null;
  priceHt: number;
  vatRate: number;
  priceTtc: number;
  imageUrl: string | null;
  gallery: string[];
  categoryId: number | null;
  categoryName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  visibleOnStorefront: boolean;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
  variants: Array<{
    id: number;
    productId: number;
    sku: string;
    barcode: string | null;
    size: string | null;
    color: string | null;
    threshold: number;
    onHand: number;
    createdAt: string;
  }>;
  totalOnHand: number;
};

export async function buildProductDetails(
  productIds: number[],
): Promise<ProductWithDetails[]> {
  if (productIds.length === 0) return [];

  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const variants = await db
    .select()
    .from(variantsTable)
    .where(inArray(variantsTable.productId, productIds));

  const onHandMap = await getOnHandMap();

  const categoryIds = Array.from(
    new Set(products.map((p) => p.categoryId).filter((v): v is number => v !== null)),
  );
  const supplierIds = Array.from(
    new Set(products.map((p) => p.supplierId).filter((v): v is number => v !== null)),
  );

  const categories = categoryIds.length
    ? await db.select().from(categoriesTable).where(inArray(categoriesTable.id, categoryIds))
    : [];
  const suppliers = supplierIds.length
    ? await db.select().from(suppliersTable).where(inArray(suppliersTable.id, supplierIds))
    : [];
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const supMap = new Map(suppliers.map((s) => [s.id, s]));

  const variantsByProduct = new Map<number, typeof variants>();
  for (const v of variants) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const orderMap = new Map(productIds.map((id, idx) => [id, idx]));

  return products
    .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
    .map((p) => {
      const productVariants = (variantsByProduct.get(p.id) ?? []).map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        barcode: v.barcode,
        size: v.size,
        color: v.color,
        threshold: v.threshold,
        onHand: onHandMap.get(v.id) ?? 0,
        createdAt: v.createdAt.toISOString(),
      }));
      const totalOnHand = productVariants.reduce((sum, v) => sum + v.onHand, 0);
      const priceHt = Number(p.priceHt);
      const vatRate = Number(p.vatRate);
      const priceTtc = +(priceHt * (1 + vatRate / 100)).toFixed(2);
      const cat = p.categoryId != null ? catMap.get(p.categoryId) : undefined;
      const sup = p.supplierId != null ? supMap.get(p.supplierId) : undefined;
      return {
        id: p.id,
        name: p.name,
        reference: p.reference,
        description: p.description,
        priceHt,
        vatRate,
        priceTtc,
        imageUrl: p.imageUrl,
        gallery: p.gallery,
        categoryId: p.categoryId,
        categoryName: cat?.name ?? null,
        supplierId: p.supplierId,
        supplierName: sup?.name ?? null,
        visibleOnStorefront: p.visibleOnStorefront,
        updatedBy: p.updatedBy,
        updatedAt: p.updatedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        variants: productVariants,
        totalOnHand,
      };
    });
}

export async function buildSingleProductDetail(
  id: number,
): Promise<ProductWithDetails | null> {
  const [details] = await buildProductDetails([id]);
  return details ?? null;
}

export async function getProductByReferenceOrSku(
  code: string,
): Promise<{ productId: number; variantId: number } | null> {
  const [byBarcode] = await db
    .select({ id: variantsTable.id, productId: variantsTable.productId })
    .from(variantsTable)
    .where(eq(variantsTable.barcode, code))
    .limit(1);
  if (byBarcode) return { variantId: byBarcode.id, productId: byBarcode.productId };

  const [bySku] = await db
    .select({ id: variantsTable.id, productId: variantsTable.productId })
    .from(variantsTable)
    .where(eq(variantsTable.sku, code))
    .limit(1);
  if (bySku) return { variantId: bySku.id, productId: bySku.productId };

  const [byRef] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.reference, code))
    .limit(1);
  if (byRef) {
    const [v] = await db
      .select({ id: variantsTable.id })
      .from(variantsTable)
      .where(eq(variantsTable.productId, byRef.id))
      .limit(1);
    if (v) return { variantId: v.id, productId: byRef.id };
  }

  return null;
}
