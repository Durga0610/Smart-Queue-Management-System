import { Router, type IRouter, type Request } from "express";
import { db, swapListingsTable, bookingsTable, branchesTable, servicesTable, usersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { CreateSwapListingBody, AcceptSwapBody } from "@workspace/api-zod";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();
type ReqWithUser = Request & { user: typeof usersTable.$inferSelect };

async function hydrateListing(l: typeof swapListingsTable.$inferSelect) {
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, l.bookingId)).limit(1);
  if (!b) return null;
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, b.branchId)).limit(1);
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, b.serviceId)).limit(1);
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, l.ownerId)).limit(1);
  return {
    id: l.id,
    bookingId: l.bookingId,
    ownerName: owner?.name ?? "",
    branchName: branch?.name ?? "",
    serviceName: service?.name ?? "",
    bookingDate: b.bookingDate,
    timeSlot: b.timeSlot,
    tokenNumber: b.tokenNumber,
    note: l.note,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/swap/listings", requireUser, async (req, res): Promise<void> => {
  const user = (req as ReqWithUser).user;
  const rows = await db.select().from(swapListingsTable).where(eq(swapListingsTable.status, "open")).orderBy(desc(swapListingsTable.createdAt));
  const out = (await Promise.all(rows.filter((r) => r.ownerId !== user.id).map(hydrateListing))).filter((x): x is NonNullable<typeof x> => x !== null);
  res.json(out);
});

router.get("/swap/listings/mine", requireUser, async (req, res): Promise<void> => {
  const user = (req as ReqWithUser).user;
  const rows = await db.select().from(swapListingsTable).where(and(eq(swapListingsTable.ownerId, user.id), eq(swapListingsTable.status, "open"))).orderBy(desc(swapListingsTable.createdAt));
  const out = (await Promise.all(rows.map(hydrateListing))).filter((x): x is NonNullable<typeof x> => x !== null);
  res.json(out);
});

router.post("/swap/list", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateSwapListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as ReqWithUser).user;
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, parsed.data.bookingId)).limit(1);
  if (!b || b.userId !== user.id) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (b.status !== "waiting" && b.status !== "booked") {
    res.status(400).json({ error: "Only waiting/booked tokens can be listed" });
    return;
  }
  const [l] = await db.insert(swapListingsTable).values({ bookingId: b.id, ownerId: user.id, note: parsed.data.note ?? "" }).returning();
  const out = await hydrateListing(l!);
  res.json(out);
});

router.post("/swap/:listingId/accept", requireUser, async (req, res): Promise<void> => {
  const listingId = parseInt(String(req.params.listingId), 10);
  const parsed = AcceptSwapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as ReqWithUser).user;
  const [l] = await db.select().from(swapListingsTable).where(eq(swapListingsTable.id, listingId)).limit(1);
  if (!l || l.status !== "open") {
    res.status(404).json({ error: "Listing not available" });
    return;
  }
  if (l.ownerId === user.id) {
    res.status(400).json({ error: "Cannot accept your own listing" });
    return;
  }
  const [theirBooking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, l.bookingId)).limit(1);
  const [myBooking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, parsed.data.myBookingId)).limit(1);
  if (!theirBooking || !myBooking || myBooking.userId !== user.id) {
    res.status(404).json({ error: "Bookings not found" });
    return;
  }

  // Swap the user_id (slot owners trade)
  await db.update(bookingsTable).set({ userId: user.id }).where(eq(bookingsTable.id, theirBooking.id));
  await db.update(bookingsTable).set({ userId: l.ownerId }).where(eq(bookingsTable.id, myBooking.id));
  await db.update(swapListingsTable).set({ status: "completed" }).where(eq(swapListingsTable.id, l.id));

  res.json({ ok: true });
});

router.delete("/swap/:listingId", requireUser, async (req, res): Promise<void> => {
  const listingId = parseInt(String(req.params.listingId), 10);
  const user = (req as ReqWithUser).user;
  const [l] = await db.select().from(swapListingsTable).where(eq(swapListingsTable.id, listingId)).limit(1);
  if (!l || l.ownerId !== user.id) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.update(swapListingsTable).set({ status: "cancelled" }).where(eq(swapListingsTable.id, l.id));
  res.json({ ok: true });
});

export default router;
