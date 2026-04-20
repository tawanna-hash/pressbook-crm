/**
 * One-off migration: add portal-linkage columns to the `contacts` table.
 *
 * Bypasses drizzle-kit because it wants to recreate unrelated primary keys.
 * Run with:  npx tsx scripts/add-contact-portal-columns.ts
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — check .env.local");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  console.log("Adding clerk_id and portal_activated_at to contacts...");

  await sql`
    ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS portal_activated_at TIMESTAMP
  `;

  // Add unique constraint on clerk_id (only if it doesn't exist yet).
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'contacts_clerk_id_unique'
      ) THEN
        ALTER TABLE contacts
        ADD CONSTRAINT contacts_clerk_id_unique UNIQUE (clerk_id);
      END IF;
    END $$
  `;

  console.log("✅ Done. Columns added and unique constraint in place.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  await sql.end();
  process.exit(1);
});
