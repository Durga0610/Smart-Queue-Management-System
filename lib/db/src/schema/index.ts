import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("customer"),
  karma: integer("karma").notNull().default(50),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const branchesTable = sqliteTable("branches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  openCounters: integer("open_counters").notNull().default(3),
});

export const servicesTable = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  avgDurationMinutes: integer("avg_duration_minutes").notNull().default(8),
  icon: text("icon").notNull().default("Banknote"),
  description: text("description").notNull().default(""),
});

export const checklistItemsTable = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  itemKey: text("item_key").notNull(),
  label: text("label").notNull(),
  required: integer("required").notNull().default(1),
  hint: text("hint").notNull().default(""),
});

export const bookingsTable = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  servedAt: integer("served_at", { mode: 'timestamp' }),
});

export const notificationsTable = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: integer("read").notNull().default(0),
  bookingId: integer("booking_id"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const sosRequestsTable = sqliteTable("sos_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  staffNote: text("staff_note").notNull().default(""),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer("resolved_at", { mode: 'timestamp' }),
});

export const swapListingsTable = sqliteTable("swap_listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
