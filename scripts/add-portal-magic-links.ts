/**
 * Migration — creates the `portal_magic_links` table used for the
 * passwordless client portal session (staff emails a link, client
 * clicks it, one-shot session begins).
 *
 * Idempotent; safe to re-run.
 *
 *   npx tsx scripts/add-portal-magic-links.ts
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
  throw new Error(
    "DATABASE_URL is not set — export it or add it to .env.local.",
  );
}

async function main() {
  const url = loadDatabaseUrl();
  const sql = postgres(url, { ssl: "require", max: 1 });

  try {
    console.log("Creating portal_magic_links…");

    await sql`
      CREATE TABLE IF NOT EXISTS portal_magic_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id),
        contact_id UUID NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        link_expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP,
        session_expires_at TIMESTAMP,
        created_by_user_id UUID,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS portal_magic_links_contact_idx
        ON portal_magic_links (contact_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS portal_magic_links_org_idx
        ON portal_magic_links (org_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS portal_magic_links_created_at_idx
        ON portal_magic_links (created_at DESC)
    `;

    console.log("Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
