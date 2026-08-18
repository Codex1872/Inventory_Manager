import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@workspace/db";

export type JwtPayload = {
  userId: number;
  email:  string;
  role:   UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is required");
  return secret;
}

// Attache req.user si le token est valide, continue même sans token
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, jwtSecret()) as JwtPayload;
    } catch {
      // token invalide → pas d'erreur, juste pas de user
    }
  }
  next();
}

// Exige un token valide
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: "Authentification requise" });
      return;
    }
    next();
  });
}

// Exige un rôle spécifique (ou plusieurs)
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ error: "Accès refusé" });
        return;
      }
      next();
    });
  };
}
