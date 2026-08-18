import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";

const router: IRouter = Router();

function format(s: typeof suppliersTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    leadTimeDays: s.leadTimeDays,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/suppliers", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(suppliersTable)
    .orderBy(sql`${suppliersTable.name} ASC`);
  res.json(rows.map(format));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.name !== "string" || !body.name.trim()) {
    res.status(400).json({ error: "Nom requis" });
    return;
  }
  const [created] = await db
    .insert(suppliersTable)
    .values({
      name: body.name.trim(),
      contactName:
        typeof body.contactName === "string" ? body.contactName : null,
      email: typeof body.email === "string" ? body.email : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      leadTimeDays:
        typeof body.leadTimeDays === "number" ? body.leadTimeDays : 7,
      notes: typeof body.notes === "string" ? body.notes : null,
    })
    .returning();
  res.status(201).json(format(created));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.contactName === "string" || body.contactName === null)
    update.contactName = body.contactName;
  if (typeof body.email === "string" || body.email === null)
    update.email = body.email;
  if (typeof body.phone === "string" || body.phone === null)
    update.phone = body.phone;
  if (typeof body.leadTimeDays === "number")
    update.leadTimeDays = body.leadTimeDays;
  if (typeof body.notes === "string" || body.notes === null)
    update.notes = body.notes;

  const [updated] = await db
    .update(suppliersTable)
    .set(update)
    .where(eq(suppliersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Fournisseur introuvable" });
    return;
  }
  res.json(format(updated));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.sendStatus(204);
});

export default router;
