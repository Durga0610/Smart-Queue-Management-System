import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:C:/Users/HOME/Downloads/Unique-Finance-Tracker/Unique-Finance-Tracker/local.db",
  },
} satisfies Config;
