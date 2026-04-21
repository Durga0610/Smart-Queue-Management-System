import { db, branchesTable, bookingsTable, servicesTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

export type PulseLevel = "calm" | "moderate" | "busy" | "packed";

export function levelFor(queueLength: number): PulseLevel {
  if (queueLength <= 3) return "calm";
  if (queueLength <= 8) return "moderate";
  if (queueLength <= 15) return "busy";
  return "packed";
}

export async function computeBranchPulse(branchId: number) {
  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
  if (!branch) return null;
  const today = new Date().toISOString().slice(0, 10);

  const activeRows = await db
    .select({ id: bookingsTable.id, serviceId: bookingsTable.serviceId, status: bookingsTable.status, tokenNumber: bookingsTable.tokenNumber, timeSlot: bookingsTable.timeSlot })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.branchId, branchId), eq(bookingsTable.bookingDate, today)));

  const services = await db.select().from(servicesTable);
  const svcMap = new Map(services.map((s) => [s.id, s] as const));

  const waiting = activeRows.filter((b) => b.status === "waiting" || b.status === "booked");
  const serving = activeRows.find((b) => b.status === "serving");

  const queueLength = waiting.length;
  const totalServiceMinutes = waiting.reduce((acc, b) => acc + (svcMap.get(b.serviceId)?.avgDurationMinutes ?? 8), 0);
  const counters = Math.max(1, branch.openCounters);
  const avgWaitMinutes = Math.round(totalServiceMinutes / counters);

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    city: branch.city,
    lat: branch.lat,
    lng: branch.lng,
    queueLength,
    avgWaitMinutes,
    pulseLevel: levelFor(queueLength),
    openCounters: branch.openCounters,
    nowServing: serving?.tokenNumber ?? null,
  };
}

export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h < 17; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hr = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      slots.push(`${hr.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`);
    }
  }
  return slots;
}

export function makeTokenNumber(serviceCode: string, n: number): string {
  return `${serviceCode}-${(100 + n).toString()}`;
}
