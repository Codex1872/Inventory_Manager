import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  suppliersTable,
  variantsTable,
  productsTable,
  movementsTable,
} from "@workspace/db";

const router: IRouter = Router();

async function buildOrders(orderIds?: number[]) {
  let query = db
    .select()
    .from(purchaseOrdersTable)
    .orderBy(desc(purchaseOrdersTable.createdAt))
    .$dynamic();
  if (orderIds && orderIds.length > 0) {
    query = query.where(inArray(purchaseOrdersTable.id, orderIds));
  }
  const orders = await query;
  if (orders.length === 0) return [];

  const supplierIds = Array.from(new Set(orders.map((o) => o.supplierId)));
  const suppliers = await db
    .select()
    .from(suppliersTable)
    .where(inArray(suppliersTable.id, supplierIds));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

  const items = await db
    .select()
    .from(purchaseOrderItemsTable)
    .where(
      inArray(
        purchaseOrderItemsTable.orderId,
        orders.map((o) => o.id),
      ),
    );
  const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
  const variants = variantIds.length
    ? await db
        .select()
        .from(variantsTable)
        .where(inArray(variantsTable.id, variantIds))
    : [];
  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const productIds = Array.from(new Set(variants.map((v) => v.productId)));
  const products = productIds.length
    ? await db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, productIds))
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const itemsByOrder = new Map<number, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return orders.map((o) => {
    const orderItems = (itemsByOrder.get(o.id) ?? []).map((item) => {
      const variant = variantMap.get(item.variantId);
      const product = variant ? productMap.get(variant.productId) : undefined;
      return {
        id: item.id,
        variantId: item.variantId,
        sku: variant?.sku ?? "",
        productName: product?.name ?? "",
        quantity: item.quantity,
        unitPriceHt: Number(item.unitPriceHt),
      };
    });
    const totalHt = orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceHt,
      0,
    );
    return {
      id: o.id,
      reference: o.reference,
      supplierId: o.supplierId,
      supplierName: supplierMap.get(o.supplierId)?.name ?? "",
      status: o.status as "draft" | "sent" | "received" | "cancelled",
      totalHt: +totalHt.toFixed(2),
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      expectedAt: o.expectedAt ? o.expectedAt.toISOString() : null,
      items: orderItems,
    };
  });
}

router.get("/orders", async (_req, res): Promise<void> => {
  const orders = await buildOrders();
  res.json(orders);
});

router.post("/orders", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const supplierId = Number(body.supplierId);
  if (!Number.isFinite(supplierId)) {
    res.status(400).json({ error: "Fournisseur requis" });
    return;
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    res.status(400).json({ error: "Au moins un article requis" });
    return;
  }
  const reference = `BC-${Date.now().toString(36).toUpperCase()}`;
  const expectedAt =
    typeof body.expectedAt === "string" ? new Date(body.expectedAt) : null;
  const [order] = await db
    .insert(purchaseOrdersTable)
    .values({
      reference,
      supplierId,
      status: "draft",
      notes: typeof body.notes === "string" ? body.notes : null,
      expectedAt,
    })
    .returning();

  for (const rawItem of items) {
    const item = rawItem as Record<string, unknown>;
    const variantId = Number(item.variantId);
    const quantity = Number(item.quantity ?? 0);
    const unitPriceHt = Number(item.unitPriceHt ?? 0);
    if (!Number.isFinite(variantId) || quantity <= 0) continue;
    await db.insert(purchaseOrderItemsTable).values({
      orderId: order.id,
      variantId,
      quantity,
      unitPriceHt: unitPriceHt.toFixed(2),
    });
  }

  const [detail] = await buildOrders([order.id]);
  res.status(201).json(detail);
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  const status = typeof body.status === "string" ? body.status : "";
  if (!["draft", "sent", "received", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Statut invalide" });
    return;
  }
  const [updated] = await db
    .update(purchaseOrdersTable)
    .set({ status })
    .where(eq(purchaseOrdersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  // If status set to received, create stock-in movements for each line
  if (status === "received") {
    const items = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.orderId, id));
    for (const item of items) {
      await db.insert(movementsTable).values({
        variantId: item.variantId,
        type: "in",
        quantity: item.quantity,
        operator: "Réception BC",
        reason: `Réception ${updated.reference}`,
      });
    }
  }

  const [detail] = await buildOrders([id]);
  res.json(detail);
});

export default router;
