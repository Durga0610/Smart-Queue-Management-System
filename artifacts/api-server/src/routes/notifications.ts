import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

type ReqWithUser = import("express").Request & { user: typeof usersTable.$inferSelect };

function hydrateNotif(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read === 1,
    bookingId: n.bookingId ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  bookingId?: number,
) {
  await db.insert(notificationsTable).values({
    userId,
    type,
    title,
    body,
    bookingId: bookingId ?? null,
  });
}

router.get("/notifications", requireUser, async (req, res): Promise<void> => {
  const user = (req as ReqWithUser).user;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows.map(hydrateNotif));
});

router.post("/notifications/read-all", requireUser, async (req, res): Promise<void> => {
  const user = (req as ReqWithUser).user;
  await db
    .update(notificationsTable)
    .set({ read: 1 })
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.read, 0)));
  res.json({ ok: true });
});

router.patch("/notifications/:notificationId/read", requireUser, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.notificationId), 10);
  const user = (req as ReqWithUser).user;
  await db
    .update(notificationsTable)
    .set({ read: 1 })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ ok: true });
});

export default router;
