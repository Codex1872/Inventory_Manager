import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const router: IRouter = Router();

// Dossier de stockage des fichiers uploadés
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/uploads";

// Créer le dossier s'il n'existe pas
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format non supporté. Utilisez JPEG, PNG, WebP ou GIF."));
    }
  },
});

// ── POST /upload ─────────────────────────────────────────────────────────────
// Retourne : { url: "/uploads/<filename>" }
router.post("/upload", upload.single("file"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "Aucun fichier reçu" });
    return;
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
