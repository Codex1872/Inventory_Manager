import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { jwtSecret, requireAuth, type JwtPayload } from "../middlewares/auth";

const router: IRouter = Router();

const SALT_ROUNDS = 10;
const TOKEN_TTL   = "7d";

function makeToken(payload: JwtPayload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: TOKEN_TTL });
}

function safeUser(u: typeof usersTable.$inferSelect) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt };
}

// ── POST /auth/register ────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name } = req.body as Record<string, string>;

  if (!email?.trim() || !password || !name?.trim()) {
    res.status(400).json({ error: "email, password et name sont requis" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Cette adresse e-mail est déjà utilisée" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [user] = await db.insert(usersTable).values({
    email:    email.toLowerCase().trim(),
    passwordHash,
    name:     name.trim(),
    role:     "client",
  }).returning();

  const token = makeToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: safeUser(user) });
});

// ── POST /auth/login ───────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as Record<string, string>;

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "email et password sont requis" });
    return;
  }

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);

  if (!user || !user.active) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  const token = makeToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: safeUser(user) });
});

// ── GET /auth/me ───────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.id, req.user!.userId)).limit(1);

  if (!user || !user.active) {
    res.status(401).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.json(safeUser(user));
});

// ── PUT /auth/me ── (mise à jour du profil) ────────────────────────────────
router.put("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { name, currentPassword, newPassword } = req.body as Record<string, string>;

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (name?.trim()) updates.name = name.trim();

  if (newPassword) {
    if (!currentPassword) { res.status(400).json({ error: "Mot de passe actuel requis" }); return; }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Mot de passe actuel incorrect" }); return; }
    if (newPassword.length < 8) { res.status(400).json({ error: "Nouveau mot de passe trop court (8 car. min)" }); return; }
    updates.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  }

  const [updated] = await db.update(usersTable).set(updates)
    .where(eq(usersTable.id, req.user!.userId)).returning();
  res.json(safeUser(updated));
});

export default router;
