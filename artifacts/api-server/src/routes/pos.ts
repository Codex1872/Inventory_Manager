import { Router, type IRouter } from "express";
import { desc, inArray } from "drizzle-orm";
import {
  db,
  movementsTable,
  salesTable,
  saleItemsTable,
} from "@workspace/db";
import { getProductByReferenceOrSku, buildSingleProductDetail } from "../lib/products";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// POST /pos/scan
// Recherche un produit par code-barre, SKU ou référence.
// Retourne le produit avec son stock et son prix.
// ---------------------------------------------------------------------------
router.post("/pos/scan", async (req, res): Promise<void> => {
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
  if (!code) {
    res.status(400).json({ error: "Code requis" });
    return;
  }

  const found = await getProductByReferenceOrSku(code);
  if (!found) {
    res.json({ matched: false, message: `Aucun produit trouvé : "${code}"` });
    return;
  }

  const product = await buildSingleProductDetail(found.productId);
  const variant = product?.variants.find((v) => v.id === found.variantId);

  res.json({ matched: true, product, variant, message: "Produit trouvé" });
});

// ---------------------------------------------------------------------------
// POST /pos/checkout
// Valide un panier : crée les mouvements de sortie + enregistre la vente.
// Body: { cashier?, items: [{ variantId, productName, sku, size?, color?,
//          quantity, unitPriceHt, unitPriceTtc, vatRate }] }
// ---------------------------------------------------------------------------
router.post("/pos/checkout", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const cashier = typeof body.cashier === "string" ? body.cashier : "Admin";
  const items = Array.isArray(body.items) ? body.items as Record<string, unknown>[] : [];

  if (items.length === 0) {
    res.status(400).json({ error: "Panier vide" });
    return;
  }

  // Validation et calcul des totaux
  type ParsedItem = {
    variantId:    number;
    productName:  string;
    sku:          string;
    size:         string | null;
    color:        string | null;
    quantity:     number;
    unitPriceHt:  number;
    unitPriceTtc: number;
    vatRate:      number;
  };

  const parsed: ParsedItem[] = [];
  for (const item of items) {
    const variantId   = Number(item.variantId);
    const quantity    = Number(item.quantity ?? 0);
    const unitPriceHt = Number(item.unitPriceHt ?? 0);
    const vatRate     = Number(item.vatRate ?? 20);
    if (!Number.isFinite(variantId) || quantity <= 0) continue;
    parsed.push({
      variantId,
      productName:  String(item.productName ?? ""),
      sku:          String(item.sku ?? ""),
      size:         typeof item.size  === "string" ? item.size  : null,
      color:        typeof item.color === "string" ? item.color : null,
      quantity,
      unitPriceHt,
      unitPriceTtc: +(unitPriceHt * (1 + vatRate / 100)).toFixed(2),
      vatRate,
    });
  }

  if (parsed.length === 0) {
    res.status(400).json({ error: "Aucun article valide dans le panier" });
    return;
  }

  const totalHt  = +parsed.reduce((s, i) => s + i.unitPriceHt  * i.quantity, 0).toFixed(2);
  const totalTtc = +parsed.reduce((s, i) => s + i.unitPriceTtc * i.quantity, 0).toFixed(2);
  const reference = `VTE-${Date.now().toString(36).toUpperCase()}`;

  // Insérer la vente
  const [sale] = await db
    .insert(salesTable)
    .values({ reference, cashier, totalHt: totalHt.toFixed(2), totalTtc: totalTtc.toFixed(2) })
    .returning();

  // Insérer les lignes
  await db.insert(saleItemsTable).values(
    parsed.map((i) => ({
      saleId:       sale.id,
      variantId:    i.variantId,
      productName:  i.productName,
      sku:          i.sku,
      size:         i.size,
      color:        i.color,
      quantity:     i.quantity,
      unitPriceHt:  i.unitPriceHt.toFixed(2),
      unitPriceTtc: i.unitPriceTtc.toFixed(2),
      vatRate:      i.vatRate.toFixed(2),
    })),
  );

  // Créer les mouvements de sortie
  await db.insert(movementsTable).values(
    parsed.map((i) => ({
      variantId: i.variantId,
      type:      "out" as const,
      quantity:  i.quantity,
      operator:  cashier,
      reason:    `Vente ${reference}`,
    })),
  );

  res.status(201).json({
    id:        sale.id,
    reference: sale.reference,
    cashier:   sale.cashier,
    totalHt,
    totalTtc,
    items:     parsed,
    createdAt: sale.createdAt.toISOString(),
  });
});

// ---------------------------------------------------------------------------
// GET /pos/sales
// Historique des 50 dernières ventes.
// ---------------------------------------------------------------------------
router.get("/pos/sales", async (_req, res): Promise<void> => {
  const sales = await db
    .select()
    .from(salesTable)
    .orderBy(desc(salesTable.createdAt))
    .limit(50);

  if (sales.length === 0) { res.json([]); return; }

  const saleIds = sales.map((s) => s.id);
  const items   = await db
    .select()
    .from(saleItemsTable)
    .where(inArray(saleItemsTable.saleId, saleIds));

  const itemsBySale = new Map<number, typeof items>();
  for (const item of items) {
    const list = itemsBySale.get(item.saleId) ?? [];
    list.push(item);
    itemsBySale.set(item.saleId, list);
  }

  res.json(
    sales.map((s) => ({
      id:        s.id,
      reference: s.reference,
      cashier:   s.cashier,
      totalHt:   Number(s.totalHt),
      totalTtc:  Number(s.totalTtc),
      createdAt: s.createdAt.toISOString(),
      items: (itemsBySale.get(s.id) ?? []).map((i) => ({
        variantId:    i.variantId,
        productName:  i.productName,
        sku:          i.sku,
        size:         i.size,
        color:        i.color,
        quantity:     i.quantity,
        unitPriceHt:  Number(i.unitPriceHt),
        unitPriceTtc: Number(i.unitPriceTtc),
      })),
    })),
  );
});

export default router;
