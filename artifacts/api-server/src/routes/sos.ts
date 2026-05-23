import { Router, type IRouter } from "express";
import { db, sosRequestsTable, bookingsTable, branchesTable, usersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireUser, requireStaff } from "../lib/auth";
import { createNotification } from "./notifications";

const router: IRouter = Router();

router.post("/sos", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { bookingId, reason } = req.body as { bookingId: number; reason: string };

  if (!bookingId || !reason?.trim()) {
    res.status(400).json({ error: "bookingId and reason are required" });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking || booking.userId !== user.id) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const existing = await db.select().from(sosRequestsTable).where(
    and(eq(sosRequestsTable.bookingId, bookingId), eq(sosRequestsTable.status, "pending"))
  );
  if (existing.length > 0) {
    res.status(409).json({ error: "An SOS request is already pending for this booking" });
    return;
  }

  const [sos] = await db.insert(sosRequestsTable).values({
    bookingId,
    userId: user.id,
    branchId: booking.branchId,
    reason: reason.trim(),
    status: "pending",
  }).returning();

  res.json(sos);
});

router.get("/sos/booking/:bookingId", requireUser, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const bookingId = parseInt(String(req.params.bookingId), 10);

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking || booking.userId !== user.id) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const requests = await db.select().from(sosRequestsTable)
    .where(eq(sosRequestsTable.bookingId, bookingId))
    .orderBy(desc(sosRequestsTable.createdAt))
    .limit(1);

  res.json(requests[0] ?? null);
});

router.get("/admin/sos/:branchId", requireStaff, async (req, res): Promise<void> => {
  const branchId = parseInt(String(req.params.branchId), 10);

  const pending = await db.select({
    sos: sosRequestsTable,
    userName: usersTable.name,
    tokenNumber: bookingsTable.tokenNumber,
    serviceName: bookingsTable.serviceId,
    timeSlot: bookingsTable.timeSlot,
  })
    .from(sosRequestsTable)
    .innerJoin(usersTable, eq(sosRequestsTable.userId, usersTable.id))
    .innerJoin(bookingsTable, eq(sosRequestsTable.bookingId, bookingsTable.id))
    .where(and(eq(sosRequestsTable.branchId, branchId), eq(sosRequestsTable.status, "pending")))
    .orderBy(desc(sosRequestsTable.createdAt));

  res.json(
    pending.map((r) => ({
      id: r.sos.id,
      bookingId: r.sos.bookingId,
      userId: r.sos.userId,
      userName: r.userName,
      tokenNumber: r.tokenNumber,
      timeSlot: r.timeSlot,
      reason: r.sos.reason,
      status: r.sos.status,
      createdAt: r.sos.createdAt,
    }))
  );
});

router.post("/admin/sos/:sosId/approve", requireStaff, async (req, res): Promise<void> => {
  const sosId = parseInt(String(req.params.sosId), 10);
  const { staffNote } = req.body as { staffNote?: string };

  const [sos] = await db.select().from(sosRequestsTable).where(eq(sosRequestsTable.id, sosId)).limit(1);
  if (!sos) {
    res.status(404).json({ error: "SOS request not found" });
    return;
  }

  await db.update(sosRequestsTable).set({
    status: "approved",
    staffNote: staffNote?.trim() ?? "",
    resolvedAt: new Date(),
  }).where(eq(sosRequestsTable.id, sosId));

  await db.update(bookingsTable).set({ priority: "emergency" }).where(eq(bookingsTable.id, sos.bookingId));

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, sos.bookingId)).limit(1);
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, sos.branchId)).limit(1);

  void createNotification(
    sos.userId,
    "sos_approved",
    "SOS Request Approved",
    `Your emergency request has been approved. Token ${booking?.tokenNumber} has been moved to the front of the queue at ${branch?.name}. Please proceed to the counter.`,
    sos.bookingId,
  );

  res.json({ success: true });
});

router.post("/admin/sos/:sosId/reject", requireStaff, async (req, res): Promise<void> => {
  const sosId = parseInt(String(req.params.sosId), 10);
  const { staffNote } = req.body as { staffNote?: string };

  const [sos] = await db.select().from(sosRequestsTable).where(eq(sosRequestsTable.id, sosId)).limit(1);
  if (!sos) {
    res.status(404).json({ error: "SOS request not found" });
    return;
  }

  await db.update(sosRequestsTable).set({
    status: "rejected",
    staffNote: staffNote?.trim() ?? "",
    resolvedAt: new Date(),
  }).where(eq(sosRequestsTable.id, sosId));

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, sos.bookingId)).limit(1);

  void createNotification(
    sos.userId,
    "sos_rejected",
    "SOS Request Not Approved",
    `Your emergency request for token ${booking?.tokenNumber} could not be approved at this time. ${staffNote ? `Staff note: ${staffNote}` : "Please speak to branch staff directly if urgent."}`,
    sos.bookingId,
  );

  res.json({ success: true });
});

export default router;
