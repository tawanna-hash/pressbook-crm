/**
 * Migration — adds `portal_onboarded_at` to `contacts`. Used by the
 * first-run onboarding wizard to know whether a client has already seen
 * the welcome screen.
 *
 * Idempotent; safe to re-run.
 *
 *   npx tsx scripts/add-contact-portal-onboarded.ts
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
    console.log("Adding contacts.portal_onboarded_at…");
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS portal_onboarded_at TIMESTAMP`;
    console.log("Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
