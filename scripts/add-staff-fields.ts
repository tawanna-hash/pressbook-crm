/**
 * Migration — adds staff-profile columns to `users` (location FK,
 * address block, mobile number). Idempotent; safe to re-run.
 *
 *   npx tsx scripts/add-staff-fields.ts
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const line = fs
      .readFileSync(envPath, "utf-8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("DATABASE_URL is not set.");
}

async function main() {
  const sql = postgres(loadDatabaseUrl(), { ssl: "require", max: 1 });
  try {
    console.log("Adding staff-profile columns to users…");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id UUID`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS address_2 VARCHAR(255)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(50)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS zip VARCHAR(20)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(50)`;
    console.log("✅ Done.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
