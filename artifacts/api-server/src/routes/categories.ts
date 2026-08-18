import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(categoriesTable)
    .orderBy(sql`${categoriesTable.name} ASC`);
  res.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      createdAt: c.createdAt.toISOString(),
    })),
  );
});

router.post("/categories", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.name !== "string" || !body.name.trim()) {
    res.status(400).json({ error: "Nom requis" });
    return;
  }
  const name = body.name.trim();
  const slug = toSlug(name);
  const [created] = await db
    .insert(categoriesTable)
    .values({ name, slug })
    .returning();
  res.status(201).json({
    id: created.id,
    name: created.name,
    slug: created.slug,
    createdAt: created.createdAt.toISOString(),
  });
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.sendStatus(204);
});

export default router;
