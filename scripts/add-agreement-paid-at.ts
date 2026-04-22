/**
 * Migration — adds `paid_at` to `agreements`, the canonical marker that
 * a Stripe checkout session for this agreement has completed.
 *
 * Idempotent; safe to re-run.
 *
 *   npx tsx scripts/add-agreement-paid-at.ts
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
    console.log("Adding agreements.paid_at…");
    await sql`ALTER TABLE agreements ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`;
    console.log("Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
