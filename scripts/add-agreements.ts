/**
 * Agreements schema:
 *   - enum  agreement_status (draft | sent | active | expired | cancelled)
 *   - table agreements (per-contact contract row)
 *
 * Run: npx tsx scripts/add-agreements.ts
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
  console.log("Adding agreements table + enum…");

  // Idempotent enum create.
  await sql`
    DO $$ BEGIN
      CREATE TYPE agreement_status AS ENUM (
        'draft', 'sent', 'active', 'expired', 'cancelled'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agreements (
      id                 UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id             UUID             NOT NULL REFERENCES organizations(id),
      contact_id         UUID             NOT NULL REFERENCES contacts(id),
      type               VARCHAR(100),
      status             agreement_status NOT NULL DEFAULT 'draft',
      start_date         TIMESTAMP,
      end_date           TIMESTAMP,
      amount             INTEGER,           -- stored in cents
      stripe_invoice_id  VARCHAR(255),
      notes              TEXT,
      created_at         TIMESTAMP        NOT NULL DEFAULT now(),
      updated_at         TIMESTAMP        NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_agreements_org ON agreements(org_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agreements_contact ON agreements(contact_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status)`;

  console.log("✅ Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
