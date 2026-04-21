import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "qless_sid";

function sign(value: string): string {
  const h = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  return `${value}.${h}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return value;
}

export function setSession(res: Response, userId: number): void {
  const value = sign(String(userId));
  res.cookie(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getUserIdFromReq(req: Request): number | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw || typeof raw !== "string") return null;
  const value = verify(raw);
  if (!value) return null;
  const id = parseInt(value, 10);
  return Number.isFinite(id) ? id : null;
}

export async function getUser(req: Request) {
  const id = getUserIdFromReq(req);
  if (!id) return null;
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return u ?? null;
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const u = await getUser(req);
  if (!u) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as Request & { user: typeof u }).user = u;
  next();
}

export async function requireStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  const u = await getUser(req);
  if (!u) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (u.role !== "staff") {
    res.status(403).json({ error: "Staff only" });
    return;
  }
  (req as Request & { user: typeof u }).user = u;
  next();
}
