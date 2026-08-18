import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { asc, eq, ne } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const safe = (u: typeof usersTable.$inferSelect) =>
  ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt });

// ── GET /admin/users ───────────────────────────────────────────────────────
router.get("/admin/users", requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(asc(usersTable.createdAt));
  res.json(users.map(safe));
});

// ── POST /admin/users ── (créer un vendeur / admin) ───────────────────────
router.post("/admin/users", requireRole("admin"), async (req, res): Promise<void> => {
  const { email, password, name, role } = req.body as Record<string, string>;

  if (!email?.trim() || !password || !name?.trim()) {
    res.status(400).json({ error: "email, password et name requis" }); return;
  }
  if (!["admin", "seller", "client"].includes(role)) {
    res.status(400).json({ error: "Rôle invalide (admin | seller | client)" }); return;
  }

  const existing = await db.select().from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email déjà utilisé" }); return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase().trim(), passwordHash, name: name.trim(),
    role: role as "admin" | "seller" | "client",
  }).returning();

  res.status(201).json(safe(user));
});

// ── PUT /admin/users/:id ── (modifier rôle / statut / nom) ────────────────
router.put("/admin/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, role, active, newPassword } = req.body as Record<string, string | boolean>;

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (typeof name     === "string" && name.trim())    updates.name   = name.trim();
  if (typeof active   === "boolean")                  updates.active = active;
  if (typeof role     === "string" && ["admin", "seller", "client"].includes(role))
    updates.role = role as "admin" | "seller" | "client";
  if (typeof newPassword === "string" && newPassword.length >= 8)
    updates.passwordHash = await bcrypt.hash(newPassword, 10);

  const [updated] = await db.update(usersTable).set(updates)
    .where(eq(usersTable.id, id)).returning();

  if (!updated) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
  res.json(safe(updated));
});

// ── DELETE /admin/users/:id ───────────────────────────────────────────────
router.delete("/admin/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  // On ne peut pas supprimer le dernier admin
  const admins = await db.select().from(usersTable)
    .where(eq(usersTable.role, "admin"));
  const target = admins.find((u) => u.id === id);
  if (target && admins.length <= 1) {
    res.status(400).json({ error: "Impossible de supprimer le dernier administrateur" }); return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).end();
});

export default router;
