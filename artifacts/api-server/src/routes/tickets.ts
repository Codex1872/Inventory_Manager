import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, ticketTemplatesTable } from "@workspace/db";

const router: IRouter = Router();

function format(t: typeof ticketTemplatesTable.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    width: t.width as "58mm" | "80mm",
    body: t.body,
    kind: t.kind as "movement" | "inventory" | "order",
    isDefault: t.isDefault,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/tickets/templates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ticketTemplatesTable)
    .orderBy(sql`${ticketTemplatesTable.createdAt} DESC`);
  res.json(rows.map(format));
});

router.post("/tickets/templates", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.name !== "string" || typeof body.body !== "string") {
    res.status(400).json({ error: "Nom et corps requis" });
    return;
  }
  const [created] = await db
    .insert(ticketTemplatesTable)
    .values({
      name: body.name,
      body: body.body,
      width: typeof body.width === "string" ? body.width : "80mm",
      kind: typeof body.kind === "string" ? body.kind : "movement",
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : false,
    })
    .returning();
  res.status(201).json(format(created));
});

router.patch("/tickets/templates/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.body === "string") update.body = body.body;
  if (typeof body.width === "string") update.width = body.width;
  if (typeof body.kind === "string") update.kind = body.kind;
  if (typeof body.isDefault === "boolean") update.isDefault = body.isDefault;
  const [updated] = await db
    .update(ticketTemplatesTable)
    .set(update)
    .where(eq(ticketTemplatesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Modèle introuvable" });
    return;
  }
  res.json(format(updated));
});

router.delete("/tickets/templates/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(ticketTemplatesTable).where(eq(ticketTemplatesTable.id, id));
  res.sendStatus(204);
});

router.post("/tickets/templates/:id/preview", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [template] = await db
    .select()
    .from(ticketTemplatesTable)
    .where(eq(ticketTemplatesTable.id, id))
    .limit(1);
  if (!template) {
    res.status(404).json({ error: "Modèle introuvable" });
    return;
  }
  const variables = (req.body ?? {}) as Record<string, unknown>;
  const defaults: Record<string, string> = {
    Date: new Date().toLocaleString("fr-FR"),
    StoreName: "StockFlow",
  };
  const merged: Record<string, string> = { ...defaults };
  for (const [k, v] of Object.entries(variables)) {
    if (v == null) continue;
    merged[k] = String(v);
  }
  let rendered = template.body;
  rendered = rendered.replace(/\{\{\s*\.?(\w+)\s*\}\}/g, (_match, key: string) => {
    return merged[key] ?? `{{${key}}}`;
  });
  res.json({ rendered, width: template.width });
});

export default router;
