import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    role: text("role").notNull().default("customer"),
    karma: integer("karma").notNull().default(50),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  openCounters: integer("open_counters").notNull().default(3),
});

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  avgDurationMinutes: integer("avg_duration_minutes").notNull().default(8),
  icon: text("icon").notNull().default("Banknote"),
  description: text("description").notNull().default(""),
});

export const checklistItemsTable = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  itemKey: text("item_key").notNull(),
  label: text("label").notNull(),
  required: integer("required").notNull().default(1),
  hint: text("hint").notNull().default(""),
});

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  bookingDate: text("booking_date").notNull(),
  timeSlot: text("time_slot").notNull(),
  tokenNumber: text("token_number").notNull(),
  status: text("status").notNull().default("booked"),
  groupSize: integer("group_size").notNull().default(1),
  priority: text("priority").notNull().default("normal"),
  checklistDone: text("checklist_done").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  servedAt: timestamp("served_at", { withTimezone: true }),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: integer("read").notNull().default(0),
  bookingId: integer("booking_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const swapListingsTable = pgTable("swap_listings", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
