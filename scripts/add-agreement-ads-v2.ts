/**
 * Option C: bring the agreements table up to parity with the real advertising
 * contract schema from app_holding.js. Adds ad-specific fields, auto-renewal
 * dates, billing/payment info, audit log, and a separate attachments table.
 *
 * Also extends the agreement_status enum with a "signed" value.
 *
 * Run: npx tsx scripts/add-agreement-ads-v2.ts
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
  console.log("Upgrading agreements to Option C schema…");

  // Add "signed" to the status enum (idempotent).
  await sql`
    DO $$ BEGIN
      ALTER TYPE agreement_status ADD VALUE IF NOT EXISTS 'signed' AFTER 'sent';
    EXCEPTION WHEN others THEN NULL; END $$;
  `;

  // Widen the agreements row with ad-specific + billing + audit fields.
  await sql`
    ALTER TABLE agreements
    ADD COLUMN IF NOT EXISTS company_name           VARCHAR(255),
    ADD COLUMN IF NOT EXISTS rep_name               VARCHAR(255),
    ADD COLUMN IF NOT EXISTS advertiser_email       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS advertiser_phone       VARCHAR(50),
    ADD COLUMN IF NOT EXISTS advertiser_address     TEXT,
    ADD COLUMN IF NOT EXISTS ad_size                VARCHAR(100),
    ADD COLUMN IF NOT EXISTS frequency              VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ad_rate                INTEGER,               -- cents
    ADD COLUMN IF NOT EXISTS ad_timing              JSONB,                 -- {months:[], years:n}
    ADD COLUMN IF NOT EXISTS sign_date              TIMESTAMP,
    ADD COLUMN IF NOT EXISTS exp_date               TIMESTAMP,
    ADD COLUMN IF NOT EXISTS renewal_notice_date    TIMESTAMP,
    ADD COLUMN IF NOT EXISTS billing_name           VARCHAR(255),
    ADD COLUMN IF NOT EXISTS billing_email          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS payment_mode           VARCHAR(20),           -- card|link|invoice|check
    ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT,
    ADD COLUMN IF NOT EXISTS is_uploaded            BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS audit_log              JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS eblast_packages        JSONB NOT NULL DEFAULT '[]'::jsonb
  `;

  // Separate attachments table (one agreement, N files).
  await sql`
    CREATE TABLE IF NOT EXISTS agreement_attachments (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      agreement_id  UUID         NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
      filename      VARCHAR(500) NOT NULL,
      mime_type     VARCHAR(100),
      size_bytes    INTEGER,
      data_url      TEXT,            -- base64 data URL (for now; S3/etc later)
      uploaded_at   TIMESTAMP    NOT NULL DEFAULT now(),
      uploaded_by   UUID         REFERENCES users(id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_agreement_attachments_agid ON agreement_attachments(agreement_id)`;

  // Contact_id was NOT NULL in Phase 1 but Option C allows the agreement to
  // stand without a pre-existing contact (the advertiser info carries the
  // identity for fresh uploads). Drop the NOT NULL.
  await sql`
    DO $$ BEGIN
      ALTER TABLE agreements ALTER COLUMN contact_id DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL; END $$;
  `;

  console.log("✅ Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
