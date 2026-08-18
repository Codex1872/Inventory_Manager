import { Router, type IRouter } from "express";
import { db, movementsTable } from "@workspace/db";
import { buildMovementsWithRefs } from "../lib/movements";
import {
  buildSingleProductDetail,
  getProductByReferenceOrSku,
} from "../lib/products";

const router: IRouter = Router();

router.get("/movements", async (req, res): Promise<void> => {
  const variantId =
    typeof req.query.variantId === "string"
      ? Number(req.query.variantId)
      : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const movements = await buildMovementsWithRefs(undefined, {
    variantId: Number.isFinite(variantId) ? variantId : undefined,
    type,
    limit: 100,
  });
  res.json(movements);
});

router.post("/movements", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const variantId = Number(body.variantId);
  const type =
    typeof body.type === "string" ? (body.type as string) : "in";
  const quantity = Number(body.quantity ?? 0);
  if (!Number.isFinite(variantId) || quantity <= 0) {
    res.status(400).json({ error: "Variante et quantité requises" });
    return;
  }
  if (!["in", "out", "transfer", "adjust"].includes(type)) {
    res.status(400).json({ error: "Type invalide" });
    return;
  }
  const operator = typeof body.operator === "string" ? body.operator : "Admin";
  const fromLocationId =
    typeof body.fromLocationId === "number" ? body.fromLocationId : null;
  const toLocationId =
    typeof body.toLocationId === "number" ? body.toLocationId : null;
  const reason = typeof body.reason === "string" ? body.reason : null;

  const [movement] = await db
    .insert(movementsTable)
    .values({
      variantId,
      type,
      quantity,
      fromLocationId,
      toLocationId,
      operator,
      reason,
    })
    .returning();

  const [detail] = await buildMovementsWithRefs([movement.id]);
  res.status(201).json(detail);
});

router.post("/movements/scan", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const mode = typeof body.mode === "string" ? body.mode : "lookup";
  if (!code) {
    res.status(400).json({ error: "Code requis" });
    return;
  }
  const found = await getProductByReferenceOrSku(code);
  if (!found) {
    res.json({
      matched: false,
      variant: null,
      product: null,
      movement: null,
      message: `Aucun produit trouvé pour le code "${code}"`,
    });
    return;
  }

  const productDetail = await buildSingleProductDetail(found.productId);
  const variant = productDetail?.variants.find(
    (v) => v.id === found.variantId,
  );

  if (mode === "lookup") {
    res.json({
      matched: true,
      variant: variant ?? null,
      product: productDetail,
      movement: null,
      message: "Produit trouvé",
    });
    return;
  }

  const quantity = Number(body.quantity ?? 1);
  const locationId =
    typeof body.locationId === "number" ? body.locationId : null;
  const operator = typeof body.operator === "string" ? body.operator : "Scan";

  const movementType = mode === "adjust" ? "adjust" : mode;
  const [movement] = await db
    .insert(movementsTable)
    .values({
      variantId: found.variantId,
      type: movementType,
      quantity,
      fromLocationId: movementType === "out" ? locationId : null,
      toLocationId:
        movementType === "in" || movementType === "adjust" ? locationId : null,
      operator,
      reason: `Scan ${mode}`,
    })
    .returning();

  const [movementDetail] = await buildMovementsWithRefs([movement.id]);

  res.json({
    matched: true,
    variant: variant ?? null,
    product: productDetail,
    movement: movementDetail,
    message: "Mouvement enregistré",
  });
});

export default router;
