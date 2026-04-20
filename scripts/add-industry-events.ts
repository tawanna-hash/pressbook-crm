/**
 * Create industry_events + its three settings tables:
 *   industry_event_categories   (with optional parent_id for hierarchy)
 *   industry_event_organizers
 *   industry_event_locations
 *
 * Run: npx tsx scripts/add-industry-events.ts
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
  console.log("Creating industry_events + settings tables…");

  // Events
  await sql`
    CREATE TABLE IF NOT EXISTS industry_events (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id                UUID        NOT NULL REFERENCES organizations(id),
      title                 VARCHAR(500) NOT NULL,
      description           TEXT,
      all_day               BOOLEAN     NOT NULL DEFAULT false,
      start_at              TIMESTAMP,
      end_at                TIMESTAMP,
      extra_date_times      JSONB       DEFAULT '[]'::jsonb,
      venue_name            VARCHAR(255),
      address               TEXT,
      address_2             VARCHAR(255),
      city                  VARCHAR(100),
      state                 VARCHAR(50),
      zip                   VARCHAR(20),
      website_url           VARCHAR(500),
      member_price_cents    INTEGER,
      non_member_price_cents INTEGER,
      course_number         VARCHAR(100),
      trec_license_number   VARCHAR(100),
      category              VARCHAR(255),
      organizer             VARCHAR(255),
      tags                  JSONB       DEFAULT '[]'::jsonb,
      push_to_team_calendar BOOLEAN     NOT NULL DEFAULT false,
      event_color           VARCHAR(7)  DEFAULT '#3D0740',
      linked_calendar_event_id UUID     REFERENCES calendar_events(id) ON DELETE SET NULL,
      created_by            UUID        REFERENCES users(id),
      created_at            TIMESTAMP   NOT NULL DEFAULT now(),
      updated_at            TIMESTAMP   NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_industry_events_org        ON industry_events(org_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_industry_events_start      ON industry_events(start_at)`;

  // Categories (hierarchical via parent_id)
  await sql`
    CREATE TABLE IF NOT EXISTS industry_event_categories (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID        NOT NULL REFERENCES organizations(id),
      name        VARCHAR(255) NOT NULL,
      parent_id   UUID        REFERENCES industry_event_categories(id) ON DELETE SET NULL,
      is_parent   BOOLEAN     NOT NULL DEFAULT false,
      sort_order  INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMP   NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_categories_org ON industry_event_categories(org_id)`;

  // Organizers
  await sql`
    CREATE TABLE IF NOT EXISTS industry_event_organizers (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID        NOT NULL REFERENCES organizations(id),
      name        VARCHAR(255) NOT NULL,
      created_at  TIMESTAMP   NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_organizers_org ON industry_event_organizers(org_id)`;

  // Saved Locations
  await sql`
    CREATE TABLE IF NOT EXISTS industry_event_locations (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id       UUID        NOT NULL REFERENCES organizations(id),
      venue_name   VARCHAR(255) NOT NULL,
      address      TEXT,
      city         VARCHAR(100),
      state        VARCHAR(50),
      zip          VARCHAR(20),
      created_at   TIMESTAMP   NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_locations_org ON industry_event_locations(org_id)`;

  console.log("✅ Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
