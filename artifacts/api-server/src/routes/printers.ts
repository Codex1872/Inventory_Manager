import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, printersTable } from "@workspace/db";

const router: IRouter = Router();

function format(p: typeof printersTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    connection: p.connection as "network" | "bluetooth",
    address: p.address,
    width: p.width as "58mm" | "80mm",
    isDefault: p.isDefault,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/printers", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(printersTable)
    .orderBy(sql`${printersTable.createdAt} DESC`);
  res.json(rows.map(format));
});

router.post("/printers", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (
    typeof body.name !== "string" ||
    typeof body.connection !== "string" ||
    typeof body.address !== "string" ||
    typeof body.width !== "string"
  ) {
    res.status(400).json({ error: "Champs requis manquants" });
    return;
  }
  const [created] = await db
    .insert(printersTable)
    .values({
      name: body.name,
      connection: body.connection,
      address: body.address,
      width: body.width,
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : false,
    })
    .returning();
  res.status(201).json(format(created));
});

router.delete("/printers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(printersTable).where(eq(printersTable.id, id));
  res.sendStatus(204);
});

export default router;
