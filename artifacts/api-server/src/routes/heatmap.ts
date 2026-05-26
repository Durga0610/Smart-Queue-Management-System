import { Router } from "express";
import { db, bookingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { levelFor } from "../lib/queue";

const router = Router();

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
const HOUR_LABELS: Record<number, string> = {
  9: "9 AM", 10: "10 AM", 11: "11 AM", 12: "12 PM",
  13: "1 PM", 14: "2 PM", 15: "3 PM", 16: "4 PM",
};

const DAYS = [
  { day: "Monday",    shortDay: "Mon", dow: 1 },
  { day: "Tuesday",  shortDay: "Tue", dow: 2 },
  { day: "Wednesday",shortDay: "Wed", dow: 3 },
  { day: "Thursday", shortDay: "Thu", dow: 4 },
  { day: "Friday",   shortDay: "Fri", dow: 5 },
  { day: "Saturday", shortDay: "Sat", dow: 6 },
];

// Typical weekly pattern: multiplier per hour (relative busyness)
// Peak: Mon-Fri 10-11 AM and 2-3 PM; lunch dip 12-1; Saturday lighter
const BASE_PATTERN: Record<number, number[]> = {
  // hour: [Mon, Tue, Wed, Thu, Fri, Sat]
  9:  [3, 2, 2, 3, 2, 1],
  10: [8, 7, 6, 7, 7, 4],
  11: [9, 8, 7, 8, 8, 5],
  12: [5, 4, 4, 5, 4, 3],
  13: [4, 3, 3, 4, 3, 3],
  14: [7, 7, 6, 7, 6, 4],
  15: [8, 8, 7, 8, 7, 3],
  16: [5, 4, 4, 5, 5, 2],
};

function parseHourFromSlot(slot: string): number | null {
  const m = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const pm = m[3].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h;
}

router.get("/branches/:branchId/heatmap", async (req, res) => {
  const branchId = Number(req.params.branchId);
  if (isNaN(branchId)) return res.status(400).json({ error: "Invalid branchId" });

  const allBookings = await db
    .select({ bookingDate: bookingsTable.bookingDate, timeSlot: bookingsTable.timeSlot })
    .from(bookingsTable)
    .where(eq(bookingsTable.branchId, branchId));

  // Count actual bookings by dow+hour
  const actualCounts: Record<string, number> = {};
  for (const b of allBookings) {
    const d = new Date(b.bookingDate + "T12:00:00Z");
    const dow = d.getUTCDay(); // 0=Sun
    const hour = parseHourFromSlot(b.timeSlot);
    if (hour === null || hour < 9 || hour > 16) continue;
    const key = `${dow}_${hour}`;
    actualCounts[key] = (actualCounts[key] ?? 0) + 1;
  }

  const todayDow = new Date().getDay();

  const rows = DAYS.map(({ day, shortDay, dow }) => {
    const cells = HOURS.map((hour) => {
      const base = BASE_PATTERN[hour]?.[dow - 1] ?? 2;
      const actual = actualCounts[`${dow}_${hour}`] ?? 0;
      // Blend: weight actual if we have real data, otherwise use base pattern
      const bookingCount = actual > 0 ? Math.round((actual * 0.6) + (base * 0.4)) : base;
      return {
        hour,
        label: HOUR_LABELS[hour],
        bookingCount,
        level: levelFor(bookingCount),
      };
    });
    return { day, shortDay, isToday: todayDow === dow, cells };
  });

  res.json(rows);
});

export default router;
