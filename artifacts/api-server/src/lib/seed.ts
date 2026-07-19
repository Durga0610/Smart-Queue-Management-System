import { db, usersTable, branchesTable, servicesTable, checklistItemsTable, bookingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function seedIfEmpty(): Promise<void> {
  const [{ count: userCount }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  if (userCount > 0) {
    logger.info({ userCount }, "Seed skipped — data already present");
    return;
  }

  logger.info("Seeding initial data");

  const now = new Date();

  await db.insert(usersTable).values([
    { name: "Demo Customer", email: "demo@queueless.app", password: "demo123", role: "customer", karma: 78, createdAt: now },
    { name: "Aisha Rahman", email: "aisha@queueless.app", password: "demo123", role: "customer", karma: 92, createdAt: now },
    { name: "Branch Manager", email: "staff@queueless.app", password: "staff123", role: "staff", karma: 100, createdAt: now },
  ]);

  const branches = await db.insert(branchesTable).values([
    { name: "Downtown Flagship", address: "44 Market St", city: "San Francisco", lat: 37.7898, lng: -122.4014, openCounters: 5 },
    { name: "Mission District", address: "2200 Mission St", city: "San Francisco", lat: 37.7615, lng: -122.4189, openCounters: 3 },
    { name: "Hayes Valley", address: "401 Hayes St", city: "San Francisco", lat: 37.7766, lng: -122.4244, openCounters: 2 },
    { name: "SoMa Tech Hub", address: "680 Folsom St", city: "San Francisco", lat: 37.7847, lng: -122.3989, openCounters: 4 },
    { name: "Berkeley Shattuck", address: "2100 Shattuck Ave", city: "Berkeley", lat: 37.8716, lng: -122.2683, openCounters: 3 },
  ]).returning();

  const services = await db.insert(servicesTable).values([
    { name: "Cash Deposit", code: "CD", avgDurationMinutes: 4, icon: "Banknote", description: "Deposit cash into your account" },
    { name: "Cash Withdrawal", code: "CW", avgDurationMinutes: 5, icon: "HandCoins", description: "Withdraw cash from your account" },
    { name: "Account Opening", code: "AO", avgDurationMinutes: 18, icon: "UserPlus", description: "Open a new personal or business account" },
    { name: "Loan Enquiry", code: "LE", avgDurationMinutes: 22, icon: "FileText", description: "Speak with a loan officer about home, auto, or personal loans" },
    { name: "Card Services", code: "CS", avgDurationMinutes: 9, icon: "CreditCard", description: "Replace, activate, or upgrade your debit/credit card" },
    { name: "Wire Transfer", code: "WT", avgDurationMinutes: 12, icon: "ArrowRightLeft", description: "Send a domestic or international wire" },
  ]).returning();

  const byCode = Object.fromEntries(services.map((s) => [s.code, s.id] as const));

  await db.insert(checklistItemsTable).values([
    { serviceId: byCode["CD"], itemKey: "cash", label: "Cash to deposit", required: 1, hint: "Counted and bundled if possible" },
    { serviceId: byCode["CD"], itemKey: "id", label: "Government-issued ID", required: 1, hint: "Driver's license or passport" },
    { serviceId: byCode["CD"], itemKey: "passbook", label: "Account number or passbook", required: 0, hint: "Speeds things up" },

    { serviceId: byCode["CW"], itemKey: "id", label: "Government-issued ID", required: 1, hint: "" },
    { serviceId: byCode["CW"], itemKey: "card", label: "Debit card", required: 0, hint: "" },
    { serviceId: byCode["CW"], itemKey: "slip", label: "Withdrawal slip", required: 0, hint: "Available at the counter" },

    { serviceId: byCode["AO"], itemKey: "id", label: "Government-issued photo ID", required: 1, hint: "" },
    { serviceId: byCode["AO"], itemKey: "ssn", label: "SSN or Tax ID", required: 1, hint: "" },
    { serviceId: byCode["AO"], itemKey: "address", label: "Proof of address", required: 1, hint: "Utility bill, lease, or bank statement" },
    { serviceId: byCode["AO"], itemKey: "deposit", label: "Initial deposit", required: 0, hint: "Cash or check" },

    { serviceId: byCode["LE"], itemKey: "id", label: "Government-issued ID", required: 1, hint: "" },
    { serviceId: byCode["LE"], itemKey: "income", label: "Recent pay stubs or income proof", required: 1, hint: "Last 2 months" },
    { serviceId: byCode["LE"], itemKey: "tax", label: "Last 2 years of tax returns", required: 0, hint: "For larger loans" },
    { serviceId: byCode["LE"], itemKey: "statements", label: "Bank statements", required: 0, hint: "Last 3 months" },

    { serviceId: byCode["CS"], itemKey: "id", label: "Government-issued ID", required: 1, hint: "" },
    { serviceId: byCode["CS"], itemKey: "old_card", label: "Old card (if replacing)", required: 0, hint: "" },

    { serviceId: byCode["WT"], itemKey: "id", label: "Government-issued ID", required: 1, hint: "" },
    { serviceId: byCode["WT"], itemKey: "recipient", label: "Recipient bank details", required: 1, hint: "Name, account, routing/SWIFT" },
    { serviceId: byCode["WT"], itemKey: "purpose", label: "Purpose of transfer", required: 1, hint: "" },
  ]);

  // Seed a small live queue for the flagship branch so the app isn't empty
  const today = new Date().toISOString().slice(0, 10);
  const flagship = branches[0]!.id;
  await db.insert(bookingsTable).values([
    { userId: 2, branchId: flagship, serviceId: byCode["CD"], bookingDate: today, timeSlot: "10:00 AM", tokenNumber: "CD-101", status: "completed", createdAt: now, servedAt: now },
    { userId: 2, branchId: flagship, serviceId: byCode["CW"], bookingDate: today, timeSlot: "10:15 AM", tokenNumber: "CW-102", status: "completed", createdAt: now, servedAt: now },
    { userId: 2, branchId: flagship, serviceId: byCode["AO"], bookingDate: today, timeSlot: "10:30 AM", tokenNumber: "AO-103", status: "serving", createdAt: now },
    { userId: 1, branchId: flagship, serviceId: byCode["CD"], bookingDate: today, timeSlot: "10:45 AM", tokenNumber: "CD-104", status: "waiting", createdAt: now },
    { userId: 2, branchId: flagship, serviceId: byCode["LE"], bookingDate: today, timeSlot: "11:00 AM", tokenNumber: "LE-105", status: "waiting", createdAt: now },
    { userId: 1, branchId: branches[1]!.id, serviceId: byCode["CW"], bookingDate: today, timeSlot: "11:30 AM", tokenNumber: "CW-201", status: "waiting", createdAt: now },
  ]);

  logger.info("Seed complete");
}
