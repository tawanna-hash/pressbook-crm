/**
 * Migration — creates the `organization_locations` table for the
 * multi-location portal feature. Idempotent; safe to re-run.
 *
 *   npx tsx scripts/add-organization-locations.ts
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
    console.log("Creating organization_locations table…");
    await sql`
      CREATE TABLE IF NOT EXISTS organization_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id),
        label VARCHAR(100) NOT NULL DEFAULT 'Office',
        address TEXT,
        address_2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        phone VARCHAR(50),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_org_locations_org ON organization_locations (org_id)`;
    console.log("✅ Done.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
