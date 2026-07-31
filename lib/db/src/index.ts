import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { resolve } from "path";
import * as schema from "./schema";

// In production set DATABASE_URL env var (e.g. Turso/libsql cloud URL).
// Locally: api-server CWD = artifacts/api-server, so go ../../ to workspace root.
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `file:${resolve(process.cwd(), "..", "..", "local.db")}`;

export const client = createClient({
  url: DATABASE_URL,
});

export const db = drizzle(client, { schema });

export * from "./schema";
