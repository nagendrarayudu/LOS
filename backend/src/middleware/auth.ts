import type { NextFunction, Request, Response } from "express";
import { verifyToken, type CustomerTokenPayload, type StaffTokenPayload } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffTokenPayload;
      customer?: CustomerTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export function requireStaff(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Missing bearer token" });
    try {
      const payload = verifyToken(token);
      if (payload.kind !== "staff") return res.status(403).json({ error: "Staff token required" });
      if (roles.length > 0 && !roles.includes(payload.role)) {
        return res.status(403).json({ error: "Insufficient role" });
      }
      req.staff = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = verifyToken(token);
    if (payload.kind !== "customer") return res.status(403).json({ error: "Customer token required" });
    req.customer = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
