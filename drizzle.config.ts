import { defineConfig } from "drizzle-kit";

// Load .env.local so DATABASE_URL is available when running drizzle-kit commands
process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
