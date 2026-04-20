/**
 * Booking schema:
 *   - extends `users` with booking settings (URL, duration, location, bio)
 *   - new table `booking_org_settings` (one per org — the public booking landing URL)
 *   - new table `availability_slots` (per-user weekly recurring availability)
 *
 * Run: npx tsx scripts/add-booking-tables.ts
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
  console.log("Adding booking columns + tables…");

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS public_booking_url        VARCHAR(500),
    ADD COLUMN IF NOT EXISTS meeting_duration_minutes  INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS meeting_location          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS booking_bio               TEXT
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS booking_org_settings (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id               UUID        NOT NULL UNIQUE REFERENCES organizations(id),
      public_booking_url   VARCHAR(500),
      created_at           TIMESTAMP   NOT NULL DEFAULT now(),
      updated_at           TIMESTAMP   NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS availability_slots (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id        UUID        NOT NULL REFERENCES organizations(id),
      user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
      day_of_week   INTEGER     NOT NULL,                  -- 0=Sun … 6=Sat
      start_time    VARCHAR(5)  NOT NULL,                  -- "09:00"
      end_time      VARCHAR(5)  NOT NULL,                  -- "17:00"
      created_at    TIMESTAMP   NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_availability_org_user ON availability_slots(org_id, user_id)`;

  console.log("✅ Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
