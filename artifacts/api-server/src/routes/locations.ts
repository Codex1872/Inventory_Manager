import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, locationsTable } from "@workspace/db";

const router: IRouter = Router();

function format(l: typeof locationsTable.$inferSelect) {
  return {
    id: l.id,
    name: l.name,
    zone: l.zone,
    aisle: l.aisle,
    shelf: l.shelf,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/locations", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(locationsTable)
    .orderBy(sql`${locationsTable.name} ASC`);
  res.json(rows.map(format));
});

router.post("/locations", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.name !== "string" || !body.name.trim()) {
    res.status(400).json({ error: "Nom requis" });
    return;
  }
  const [created] = await db
    .insert(locationsTable)
    .values({
      name: body.name.trim(),
      zone: typeof body.zone === "string" ? body.zone : null,
      aisle: typeof body.aisle === "string" ? body.aisle : null,
      shelf: typeof body.shelf === "string" ? body.shelf : null,
    })
    .returning();
  res.status(201).json(format(created));
});

router.delete("/locations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.sendStatus(204);
});

export default router;
