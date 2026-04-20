/**
 * Meeting-polls schema (host-only scope, Phase 1):
 *   - meeting_polls          — one row per poll the host creates
 *   - meeting_poll_times     — candidate time slots on a poll
 *   - meeting_poll_votes     — invitee votes (one row per (poll,time,voter))
 *
 * Run: npx tsx scripts/add-meeting-polls.ts
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
  console.log("Adding meeting-polls tables…");

  // Enums (idempotent — pg doesn't support CREATE TYPE IF NOT EXISTS)
  await sql`
    DO $$ BEGIN
      CREATE TYPE meeting_poll_status AS ENUM ('draft', 'open', 'booked', 'closed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE meeting_poll_location AS ENUM ('zoom', 'phone', 'in_person', 'all_options');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meeting_polls (
      id                 UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id             UUID                     NOT NULL REFERENCES organizations(id),
      host_user_id       UUID                     NOT NULL REFERENCES users(id),
      share_token        VARCHAR(32)              NOT NULL UNIQUE,
      name               VARCHAR(255)             NOT NULL DEFAULT 'Meeting',
      duration_minutes   INTEGER                  NOT NULL DEFAULT 30,
      location           meeting_poll_location    NOT NULL DEFAULT 'zoom',
      description        TEXT,
      reserve_times      BOOLEAN                  NOT NULL DEFAULT FALSE,
      show_votes         BOOLEAN                  NOT NULL DEFAULT TRUE,
      language           VARCHAR(16)              NOT NULL DEFAULT 'en',
      status             meeting_poll_status      NOT NULL DEFAULT 'draft',
      selected_time_id   UUID,
      created_at         TIMESTAMP                NOT NULL DEFAULT now(),
      updated_at         TIMESTAMP                NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_meeting_polls_org ON meeting_polls(org_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meeting_polls_host ON meeting_polls(host_user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS meeting_poll_times (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      poll_id    UUID        NOT NULL REFERENCES meeting_polls(id) ON DELETE CASCADE,
      start_at   TIMESTAMPTZ NOT NULL,
      end_at     TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_meeting_poll_times_poll ON meeting_poll_times(poll_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS meeting_poll_votes (
      id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      poll_id        UUID         NOT NULL REFERENCES meeting_polls(id) ON DELETE CASCADE,
      time_id        UUID         NOT NULL REFERENCES meeting_poll_times(id) ON DELETE CASCADE,
      voter_name     VARCHAR(255) NOT NULL,
      voter_email    VARCHAR(255) NOT NULL,
      created_at     TIMESTAMP    NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_meeting_poll_votes_poll ON meeting_poll_votes(poll_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meeting_poll_votes_time ON meeting_poll_votes(time_id)`;
  // Prevent a voter voting twice for the same time
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_poll_votes_unique
    ON meeting_poll_votes (time_id, lower(voter_email))
  `;

  console.log("✅ Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
