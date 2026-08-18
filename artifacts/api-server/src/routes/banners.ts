import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, bannersTable } from "@workspace/db";

const router: IRouter = Router();

function format(b: typeof bannersTable.$inferSelect) {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl,
    startsAt: b.startsAt ? b.startsAt.toISOString() : null,
    endsAt: b.endsAt ? b.endsAt.toISOString() : null,
    active: b.active,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/banners", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(bannersTable)
    .orderBy(desc(bannersTable.createdAt));
  res.json(rows.map(format));
});

router.post("/banners", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.title !== "string" || typeof body.imageUrl !== "string") {
    res.status(400).json({ error: "Titre et image requis" });
    return;
  }
  const [created] = await db
    .insert(bannersTable)
    .values({
      title: body.title,
      subtitle: typeof body.subtitle === "string" ? body.subtitle : null,
      imageUrl: body.imageUrl,
      linkUrl: typeof body.linkUrl === "string" ? body.linkUrl : null,
      startsAt:
        typeof body.startsAt === "string" ? new Date(body.startsAt) : null,
      endsAt: typeof body.endsAt === "string" ? new Date(body.endsAt) : null,
      active: typeof body.active === "boolean" ? body.active : true,
    })
    .returning();
  res.status(201).json(format(created));
});

router.delete("/banners/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(bannersTable).where(eq(bannersTable.id, id));
  res.sendStatus(204);
});

export default router;
