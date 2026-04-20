/**
 * Add agent_email + client_name free-text columns to calendar_events for
 * the Team Calendar view. Both are optional and coexist alongside the
 * existing contact_id link.
 *
 * Run: npx tsx scripts/add-team-event-fields.ts
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
  console.log("Adding agent_email + client_name to calendar_events…");
  await sql`
    ALTER TABLE calendar_events
    ADD COLUMN IF NOT EXISTS agent_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)
  `;
  console.log("✅ Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
