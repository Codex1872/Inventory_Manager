import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  socialAccountsTable,
  socialPostsTable,
  socialMessagesTable,
  socialTriggersTable,
  productsTable,
} from "@workspace/db";

const router: IRouter = Router();

function formatAccount(a: typeof socialAccountsTable.$inferSelect) {
  return {
    id: a.id,
    platform: a.platform as "facebook" | "instagram" | "linkedin" | "tiktok",
    handle: a.handle,
    connected: a.connected,
    followers: a.followers,
    lastSyncedAt: a.lastSyncedAt ? a.lastSyncedAt.toISOString() : null,
  };
}

function formatPost(
  p: typeof socialPostsTable.$inferSelect,
  productName: string | null,
) {
  return {
    id: p.id,
    platform: p.platform as "facebook" | "instagram" | "linkedin" | "tiktok",
    message: p.message,
    imageUrl: p.imageUrl,
    productId: p.productId,
    productName,
    status: p.status as "draft" | "scheduled" | "published" | "failed",
    scheduledFor: p.scheduledFor ? p.scheduledFor.toISOString() : null,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    engagementCount: p.engagementCount,
    createdAt: p.createdAt.toISOString(),
  };
}

function formatMessage(m: typeof socialMessagesTable.$inferSelect) {
  return {
    id: m.id,
    platform: m.platform as "facebook" | "instagram" | "linkedin" | "tiktok",
    author: m.author,
    avatarUrl: m.avatarUrl,
    body: m.body,
    kind: m.kind as "dm" | "comment" | "mention",
    unread: m.unread,
    reply: m.reply,
    replyAt: m.replyAt ? m.replyAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}

function formatTrigger(t: typeof socialTriggersTable.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    event: t.event as "new_product" | "low_stock" | "restock",
    platforms: t.platforms as Array<
      "facebook" | "instagram" | "linkedin" | "tiktok"
    >,
    template: t.template,
    active: t.active,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/social/accounts", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(socialAccountsTable)
    .orderBy(socialAccountsTable.platform);
  res.json(rows.map(formatAccount));
});

router.patch("/social/accounts/:id/toggle", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [current] = await db
    .select()
    .from(socialAccountsTable)
    .where(eq(socialAccountsTable.id, id))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Compte introuvable" });
    return;
  }
  const [updated] = await db
    .update(socialAccountsTable)
    .set({
      connected: !current.connected,
      lastSyncedAt: !current.connected ? new Date() : current.lastSyncedAt,
    })
    .where(eq(socialAccountsTable.id, id))
    .returning();
  res.json(formatAccount(updated));
});

router.get("/social/posts", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : null;
  let query = db
    .select()
    .from(socialPostsTable)
    .orderBy(desc(socialPostsTable.createdAt))
    .$dynamic();
  if (status) query = query.where(eq(socialPostsTable.status, status));
  const posts = await query;
  const productIds = Array.from(
    new Set(
      posts.map((p) => p.productId).filter((v): v is number => v !== null),
    ),
  );
  const products = productIds.length
    ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  res.json(
    posts.map((p) =>
      formatPost(p, p.productId ? productMap.get(p.productId)?.name ?? null : null),
    ),
  );
});

router.post("/social/posts", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.platform !== "string" || typeof body.message !== "string") {
    res.status(400).json({ error: "Plateforme et message requis" });
    return;
  }
  const scheduledFor =
    typeof body.scheduledFor === "string" ? new Date(body.scheduledFor) : null;
  const status = scheduledFor ? "scheduled" : "draft";
  const [created] = await db
    .insert(socialPostsTable)
    .values({
      platform: body.platform,
      message: body.message,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      productId: typeof body.productId === "number" ? body.productId : null,
      scheduledFor,
      status,
    })
    .returning();
  let productName: string | null = null;
  if (created.productId) {
    const [p] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, created.productId))
      .limit(1);
    productName = p?.name ?? null;
  }
  res.status(201).json(formatPost(created, productName));
});

router.post("/social/posts/:id/publish", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [updated] = await db
    .update(socialPostsTable)
    .set({
      status: "published",
      publishedAt: new Date(),
      engagementCount: Math.floor(Math.random() * 80) + 5,
    })
    .where(eq(socialPostsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Publication introuvable" });
    return;
  }
  let productName: string | null = null;
  if (updated.productId) {
    const [p] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, updated.productId))
      .limit(1);
    productName = p?.name ?? null;
  }
  res.json(formatPost(updated, productName));
});

router.get("/social/inbox", async (req, res): Promise<void> => {
  const unreadOnly =
    typeof req.query.unreadOnly === "string"
      ? req.query.unreadOnly === "true"
      : false;
  let query = db
    .select()
    .from(socialMessagesTable)
    .orderBy(desc(socialMessagesTable.createdAt))
    .$dynamic();
  if (unreadOnly) query = query.where(eq(socialMessagesTable.unread, true));
  const rows = await query;
  res.json(rows.map(formatMessage));
});

router.post("/social/inbox/:id/reply", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, unknown>;
  if (!Number.isFinite(id) || typeof body.reply !== "string") {
    res.status(400).json({ error: "Réponse requise" });
    return;
  }
  const [updated] = await db
    .update(socialMessagesTable)
    .set({
      reply: body.reply,
      replyAt: new Date(),
      unread: false,
    })
    .where(eq(socialMessagesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Message introuvable" });
    return;
  }
  res.json(formatMessage(updated));
});

router.patch("/social/inbox/:id/read", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [updated] = await db
    .update(socialMessagesTable)
    .set({ unread: false })
    .where(eq(socialMessagesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Message introuvable" });
    return;
  }
  res.json(formatMessage(updated));
});

router.get("/social/triggers", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(socialTriggersTable)
    .orderBy(desc(socialTriggersTable.createdAt));
  res.json(rows.map(formatTrigger));
});

router.post("/social/triggers", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (
    typeof body.name !== "string" ||
    typeof body.event !== "string" ||
    typeof body.template !== "string" ||
    !Array.isArray(body.platforms)
  ) {
    res.status(400).json({ error: "Champs requis manquants" });
    return;
  }
  const platforms = (body.platforms as unknown[]).filter(
    (v): v is string => typeof v === "string",
  );
  const [created] = await db
    .insert(socialTriggersTable)
    .values({
      name: body.name,
      event: body.event,
      platforms,
      template: body.template,
      active: typeof body.active === "boolean" ? body.active : true,
    })
    .returning();
  res.status(201).json(formatTrigger(created));
});

router.delete("/social/triggers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(socialTriggersTable).where(eq(socialTriggersTable.id, id));
  res.sendStatus(204);
});

export default router;
