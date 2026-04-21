import { Router, type IRouter, type Request } from "express";
import { db, bookingsTable, branchesTable, servicesTable, checklistItemsTable, usersTable } from "@workspace/db";
import { and, eq, sql, desc } from "drizzle-orm";
import { CreateBookingBody, UpdateBookingChecklistBody } from "@workspace/api-zod";
import { requireUser } from "../lib/auth";
import { generateTimeSlots, makeTokenNumber, computeBranchPulse } from "../lib/queue";

const router: IRouter = Router();

type ReqWithUser = Request & { user: typeof usersTable.$inferSelect };

async function hydrate(b: typeof bookingsTable.$inferSelect) {
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, b.branchId)).limit(1);
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, b.serviceId)).limit(1);
  const checklist = await db.select().from(checklistItemsTable).where(eq(checklistItemsTable.serviceId, b.serviceId));
  let done: string[] = [];
  try { done = JSON.parse(b.checklistDone) as string[]; } catch { done = []; }
  return {
    id: b.id,
    userId: b.userId,
    branchId: b.branchId,
    branchName: branch?.name ?? "",
    serviceId: b.serviceId,
    serviceName: service?.name ?? "",
    bookingDate: b.bookingDate,
    timeSlot: b.timeSlot,
    tokenNumber: b.tokenNumber,
    status: b.status,
    groupSize: b.groupSize,
    priority: b.priority,
    checklistCompleted: done.length,
    checklistTotal: checklist.length,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/smart-slots", async (req, res): Promise<void> => {
  const branchId = parseInt(String(req.query.branchId), 10);
  const serviceId = parseInt(String(req.query.serviceId), 10);
  const date = String(req.query.date ?? "");
  if (!Number.isFinite(branchId) || !Number.isFinite(serviceId) || !date) {
    res.status(400).json({ error: "branchId, serviceId, date required" });
    return;
  }
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId)).limit(1);
  if (!branch || !service) {
    res.status(404).json({ error: "Branch or service not found" });
    return;
  }
  const existing = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.branchId, branchId), eq(bookingsTable.bookingDate, date)));

  const slots = generateTimeSlots();
  const counters = Math.max(1, branch.openCounters);
  const slotLoad = new Map<string, number>();
  for (const b of existing) {
    if (b.status === "cancelled" || b.status === "no_show") continue;
    slotLoad.set(b.timeSlot, (slotLoad.get(b.timeSlot) ?? 0) + 1);
  }

  const ranked = slots.map((slot) => {
    const load = slotLoad.get(slot) ?? 0;
    const expectedWait = Math.round((load / counters) * service.avgDurationMinutes);
    const score = 100 - Math.min(100, expectedWait * 4 + load * 2);
    let label = "Open";
    if (load === 0) label = "Wide open";
    else if (load <= counters) label = "Quick in/out";
    else if (load <= counters * 2) label = "Moderate";
    else label = "Busy";
    return { timeSlot: slot, expectedWaitMinutes: expectedWait, score, label, recommended: false };
  });

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 6).map((s, i) => ({ ...s, recommended: i === 0 }));
  // sort top by chronological for nicer UI
  const slotIndex = new Map(slots.map((s, i) => [s, i] as const));
  top.sort((a, b) => (slotIndex.get(a.timeSlot)! - slotIndex.get(b.timeSlot)!));
  res.json(top);
});

router.get("/bookings", requireUser, async (req, res): Promise<void> => {
  const user = (req as ReqWithUser).user;
  const rows = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, user.id)).orderBy(desc(bookingsTable.createdAt));
  const out = await Promise.all(rows.map(hydrate));
  res.json(out);
});

router.post("/bookings", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as ReqWithUser).user;
  const { branchId, serviceId, bookingDate, timeSlot, groupSize, priority } = parsed.data;
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId)).limit(1);
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.branchId, branchId), eq(bookingsTable.serviceId, serviceId), eq(bookingsTable.bookingDate, bookingDate)));
  const tokenNumber = makeTokenNumber(service.code, count + 1);
  const [b] = await db.insert(bookingsTable).values({
    userId: user.id,
    branchId,
    serviceId,
    bookingDate,
    timeSlot,
    tokenNumber,
    status: "waiting",
    groupSize: groupSize ?? 1,
    priority: priority ?? "normal",
  }).returning();
  if (!b) {
    res.status(500).json({ error: "Could not create booking" });
    return;
  }
  res.json(await hydrate(b));
});

router.get("/bookings/:bookingId", requireUser, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.bookingId), 10);
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!b) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await hydrate(b));
});

router.delete("/bookings/:bookingId", requireUser, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.bookingId), 10);
  const user = (req as ReqWithUser).user;
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!b || b.userId !== user.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, id));
  res.json({ ok: true });
});

router.patch("/bookings/:bookingId/checklist", requireUser, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.bookingId), 10);
  const parsed = UpdateBookingChecklistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as ReqWithUser).user;
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!b || b.userId !== user.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.update(bookingsTable).set({ checklistDone: JSON.stringify(parsed.data.completedItems) }).where(eq(bookingsTable.id, id));
  const [updated] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  res.json(await hydrate(updated!));
});

export default router;
export { hydrate as hydrateBooking };
