import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

export const client = createClient({
  url: "file:C:/Users/HOME/Downloads/Unique-Finance-Tracker/Unique-Finance-Tracker/local.db",
});

export const db = drizzle(client, { schema });

export * from "./schema";
