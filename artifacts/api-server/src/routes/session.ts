import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { setSession, clearSession, getUser } from "../lib/auth";

const router: IRouter = Router();

router.post("/session/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const [u] = await db.insert(usersTable).values({
    name,
    email: email.toLowerCase(),
    password,
    role: "customer",
    karma: 50,
    createdAt: new Date(),
  }).returning();
  if (!u) {
    res.status(500).json({ error: "Could not create user" });
    return;
  }
  setSession(res, u.id);
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, karma: u.karma });
});

router.post("/session/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [u] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!u || u.password !== password) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  setSession(res, u.id);
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, karma: u.karma });
});

router.get("/session/me", async (req, res): Promise<void> => {
  const u = await getUser(req);
  if (!u) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, karma: u.karma });
});

router.post("/session/logout", async (_req, res): Promise<void> => {
  clearSession(res);
  res.json({ ok: true });
});

export default router;
