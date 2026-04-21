/**
 * Migration — adds the Client Portal columns to `organizations` and
 * creates the `portal_files` table. Idempotent; safe to re-run.
 *
 *   npx tsx scripts/add-client-portal.ts
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Fallback — read `.env.local` directly.
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const line = fs
      .readFileSync(envPath, "utf-8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim();
  }
  throw new Error(
    "DATABASE_URL is not set — export it or add it to .env.local.",
  );
}

async function main() {
  const url = loadDatabaseUrl();
  const sql = postgres(url, { ssl: "require", max: 1 });

  try {
    console.log("Adding Client Portal columns + table…");

    // organizations — agency profile fields for the portal header
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_2 VARCHAR(255)`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city VARCHAR(100)`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state VARCHAR(50)`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zip VARCHAR(20)`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website_url VARCHAR(500)`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS about TEXT`;

    // portal_files — shared store for agency-client file exchange
    await sql`
      CREATE TABLE IF NOT EXISTS portal_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id),
        contact_id UUID,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        mime_type VARCHAR(100),
        size_bytes INTEGER,
        uploaded_by_user_id UUID,
        uploaded_by_contact_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_portal_files_org ON portal_files (org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_portal_files_contact ON portal_files (contact_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_portal_files_created ON portal_files (created_at DESC)`;

    console.log("✅ Done.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
