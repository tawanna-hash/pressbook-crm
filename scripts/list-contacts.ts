/**
 * Quick diagnostic — list all contacts and show their link status.
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
  const rows = await sql<
    {
      id: string;
      email: string | null;
      first_name: string;
      last_name: string | null;
      clerk_id: string | null;
      portal_activated_at: Date | null;
    }[]
  >`
    SELECT id, email, first_name, last_name, clerk_id, portal_activated_at
    FROM contacts
    ORDER BY created_at DESC
    LIMIT 20
  `;

  if (rows.length === 0) {
    console.log("No contacts found.");
  } else {
    console.log(`Found ${rows.length} contact(s):\n`);
    for (const r of rows) {
      const name = `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`;
      const linked = r.clerk_id ? "✓ linked" : "  not linked";
      console.log(`  ${linked}   ${r.email ?? "(no email)"}    ${name}`);
    }
  }
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
