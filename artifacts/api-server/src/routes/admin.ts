import { Router, type IRouter } from "express";
import { db, bookingsTable, branchesTable, servicesTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { UpdateBookingStatusBody } from "@workspace/api-zod";
import { requireStaff } from "../lib/auth";
import { computeBranchPulse } from "../lib/queue";
import { hydrateBooking } from "./bookings";

const router: IRouter = Router();

router.get("/admin/queue/:branchId", requireStaff, async (req, res): Promise<void> => {
  const branchId = parseInt(String(req.params.branchId), 10);
  const today = new Date().toISOString().slice(0, 10);
  const branch = await computeBranchPulse(branchId);
  if (!branch) {
    res.status(404).json({ error: "Branch not found" });
    return;
  }
  const all = await db.select().from(bookingsTable).where(and(eq(bookingsTable.branchId, branchId), eq(bookingsTable.bookingDate, today)));
  const prio = (p: string) => (p && p !== "normal" ? 0 : 1);
  const sorted = all.sort((a, b) => prio(a.priority) - prio(b.priority) || a.timeSlot.localeCompare(b.timeSlot) || a.id - b.id);
  const nowServing = await Promise.all(sorted.filter((b) => b.status === "serving").map(hydrateBooking));
  const upcoming = await Promise.all(sorted.filter((b) => b.status === "waiting" || b.status === "booked").map(hydrateBooking));
  const completedToday = await Promise.all(sorted.filter((b) => b.status === "completed").map(hydrateBooking));
  res.json({ branch, nowServing, upcoming, completedToday });
});

router.post("/admin/queue/:branchId/next", requireStaff, async (req, res): Promise<void> => {
  const branchId = parseInt(String(req.params.branchId), 10);
  const today = new Date().toISOString().slice(0, 10);

  // Mark any current serving as completed
  const serving = await db.select().from(bookingsTable).where(and(eq(bookingsTable.branchId, branchId), eq(bookingsTable.bookingDate, today), eq(bookingsTable.status, "serving")));
  for (const s of serving) {
    await db.update(bookingsTable).set({ status: "completed", servedAt: new Date() }).where(eq(bookingsTable.id, s.id));
  }

  const waiting = await db.select().from(bookingsTable).where(and(eq(bookingsTable.branchId, branchId), eq(bookingsTable.bookingDate, today), eq(bookingsTable.status, "waiting")));
  const prio = (p: string) => (p && p !== "normal" ? 0 : 1);
  const sorted = waiting.sort((a, b) => prio(a.priority) - prio(b.priority) || a.timeSlot.localeCompare(b.timeSlot) || a.id - b.id);
  const next = sorted[0];
  if (!next) {
    res.status(404).json({ error: "No tokens waiting" });
    return;
  }
  await db.update(bookingsTable).set({ status: "serving" }).where(eq(bookingsTable.id, next.id));
  const [updated] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, next.id)).limit(1);
  res.json(await hydrateBooking(updated!));
});

router.patch("/admin/booking/:bookingId/status", requireStaff, async (req, res): Promise<void> => {
  const bookingId = parseInt(String(req.params.bookingId), 10);
  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const setVals: { status: string; servedAt?: Date } = { status: parsed.data.status };
  if (parsed.data.status === "completed") setVals.servedAt = new Date();
  await db.update(bookingsTable).set(setVals).where(eq(bookingsTable.id, bookingId));
  const [updated] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await hydrateBooking(updated));
});

router.get("/admin/stats/:branchId", requireStaff, async (req, res): Promise<void> => {
  const branchId = parseInt(String(req.params.branchId), 10);
  const today = new Date().toISOString().slice(0, 10);
  const services = await db.select().from(servicesTable);
  const svcMap = new Map(services.map((s) => [s.id, s] as const));
  const all = await db.select().from(bookingsTable).where(and(eq(bookingsTable.branchId, branchId), eq(bookingsTable.bookingDate, today)));
  const completed = all.filter((b) => b.status === "completed");
  const servedToday = completed.length;
  const totalDuration = completed.reduce((acc, b) => acc + (svcMap.get(b.serviceId)?.avgDurationMinutes ?? 8), 0);
  const avgServiceMinutes = completed.length ? Math.round(totalDuration / completed.length) : 0;

  // Hourly distribution from bookings (counting all today's bookings to fill the chart)
  const hours = ["09","10","11","12","13","14","15","16"];
  const hourCounts = new Map<string, number>(hours.map((h) => [h, 0]));
  for (const b of all) {
    const t = b.timeSlot;
    const m = /^(\d{2}):\d{2} (AM|PM)$/.exec(t);
    if (!m) continue;
    let h = parseInt(m[1]!, 10);
    if (m[2] === "PM" && h !== 12) h += 12;
    if (m[2] === "AM" && h === 12) h = 0;
    const key = h.toString().padStart(2, "0");
    if (hourCounts.has(key)) hourCounts.set(key, (hourCounts.get(key) ?? 0) + 1);
  }
  const hourlyDistribution = hours.map((h) => {
    const hr = parseInt(h, 10);
    const ampm = hr < 12 ? "AM" : "PM";
    const display = `${hr % 12 === 0 ? 12 : hr % 12} ${ampm}`;
    return { hour: display, count: hourCounts.get(h) ?? 0 };
  });
  const peak = hourlyDistribution.reduce((a, b) => (b.count > a.count ? b : a), hourlyDistribution[0]!);
  const throughputPerHour = avgServiceMinutes > 0 ? Math.round(60 / avgServiceMinutes) : 0;

  res.json({
    branchId,
    servedToday,
    avgServiceMinutes,
    peakHour: peak.hour,
    throughputPerHour,
    hourlyDistribution,
  });
});

export default router;
