/**
 * Expand `contacts` table with all the fields from the existing CRM's
 * Add Client form.
 *
 * Run with: npx tsx scripts/expand-clients-schema.ts
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  console.log("Expanding contacts schema...");

  await sql`
    ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS portal_email        VARCHAR(255),
    ADD COLUMN IF NOT EXISTS office_phone        VARCHAR(50),
    ADD COLUMN IF NOT EXISTS website             VARCHAR(500),
    ADD COLUMN IF NOT EXISTS industry            VARCHAR(100),
    ADD COLUMN IF NOT EXISTS license_number      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address_2           VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status              VARCHAR(20) DEFAULT 'prospect',
    ADD COLUMN IF NOT EXISTS additional_contacts JSONB       DEFAULT '[]'::jsonb
  `;

  // Backfill status for existing rows that are missing it.
  await sql`
    UPDATE contacts SET status = 'prospect' WHERE status IS NULL
  `;

  // Promote any already-linked contacts to "active" — they signed up, they're active.
  await sql`
    UPDATE contacts SET status = 'active' WHERE clerk_id IS NOT NULL
  `;

  console.log("✅ Schema expanded.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  await sql.end();
  process.exit(1);
});
