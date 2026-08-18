import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { existsSync, mkdirSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(cors());

// ── Serve uploaded images as static files ─────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/uploads";
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// ── Body parsing ──────────────────────────────────────────────────────────
// NOTE: /api/webhook/stripe needs raw body → must be registered BEFORE json()
app.use("/api/webhook/stripe", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
