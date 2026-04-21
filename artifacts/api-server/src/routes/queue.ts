import { Router, type IRouter } from "express";
import { db, bookingsTable, servicesTable, branchesTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { hydrateBooking } from "./bookings";
import { computeBranchPulse } from "../lib/queue";

const router: IRouter = Router();

router.get("/queue/track/:bookingId", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.bookingId), 10);
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  if (!b) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const todays = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.branchId, b.branchId), eq(bookingsTable.bookingDate, b.bookingDate)));

  const services = await db.select().from(servicesTable);
  const svc = new Map(services.map((s) => [s.id, s] as const));
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, b.branchId)).limit(1);
  const counters = Math.max(1, branch?.openCounters ?? 1);

  const priorityRank = (p: string) => (p && p !== "normal" ? 0 : 1);
  const ordered = todays
    .filter((x) => x.status === "waiting" || x.status === "booked" || x.status === "serving")
    .sort(
      (a, b2) =>
        priorityRank(a.priority) - priorityRank(b2.priority) ||
        a.timeSlot.localeCompare(b2.timeSlot) ||
        a.id - b2.id,
    );

  const peopleAhead = Math.max(0, ordered.findIndex((x) => x.id === b.id));
  const minutesPerPerson = svc.get(b.serviceId)?.avgDurationMinutes ?? 8;
  const estimatedWaitMinutes = Math.round((peopleAhead * minutesPerPerson) / counters);

  const serving = ordered.find((x) => x.status === "serving");
  const recently = todays
    .filter((x) => x.status === "completed")
    .sort((a, b2) => (b2.servedAt?.getTime() ?? 0) - (a.servedAt?.getTime() ?? 0))
    .slice(0, 5)
    .map((x) => x.tokenNumber);

  const walkBuffer = 12;
  let leaveNowAdvice = "";
  if (b.status === "completed") leaveNowAdvice = "Your visit is complete. Thank you.";
  else if (b.status === "serving") leaveNowAdvice = "Your token is being served right now. Please head to the counter.";
  else if (estimatedWaitMinutes <= walkBuffer + 3) leaveNowAdvice = "Leave now — you'll arrive just as your token is called.";
  else if (estimatedWaitMinutes <= walkBuffer + 15) leaveNowAdvice = `Start heading over in about ${Math.max(1, estimatedWaitMinutes - walkBuffer)} min.`;
  else leaveNowAdvice = `Plenty of time — relax for ${estimatedWaitMinutes - walkBuffer} more min before leaving.`;

  res.json({
    booking: await hydrateBooking(b),
    currentlyServing: serving?.tokenNumber ?? null,
    peopleAhead,
    estimatedWaitMinutes,
    leaveNowAdvice,
    walkBufferMinutes: walkBuffer,
    recentlyCompleted: recently,
  });
});

export default router;
