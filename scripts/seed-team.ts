/**
 * Seed the same three team members (Tawanna, Doren, Caroline) into BOTH
 * RealtyLine and Newsline SA so the Booking page matches the target design.
 * Each seeded row uses a "demo_" clerk_id prefix so they never collide with
 * real Clerk accounts that sign up.
 *
 * Run: npx tsx scripts/seed-team.ts
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });

type DemoMember = {
  slug: string;         // stable key, used in clerk_id
  first: string;
  last: string;
};

// Same team for both companies
const TEAM: DemoMember[] = [
  { slug: "tawanna",  first: "Tawanna",  last: "Verock" },
  { slug: "doren",    first: "Doren",    last: "Carver" },
  { slug: "caroline", first: "Caroline", last: "Carver" },
];

const ORG_DOMAINS: Record<string, { domain: string; location: string }> = {
  realtyline: { domain: "myrealtyline.com", location: "Austin, TX" },
  newsline:   { domain: "newslinesa.com",   location: "San Antonio, TX" },
};

async function main() {
  console.log("Seeding demo team (same 3 people on both orgs)…");

  // Clean up any old demo rows so stale entries (e.g. "Derrick") disappear.
  // Only touches rows whose clerk_id starts with "demo_" — never real users.
  const deleted = await sql`
    DELETE FROM users WHERE clerk_id LIKE 'demo\\_%' ESCAPE '\\'
    RETURNING id
  `;
  if (deleted.length > 0) {
    console.log(`  • Removed ${deleted.length} old demo row(s)`);
  }

  const orgs = await sql<{ id: string; slug: string }[]>`
    SELECT id, slug FROM organizations WHERE slug IN ('realtyline', 'newsline')
  `;

  for (const org of orgs) {
    const meta = ORG_DOMAINS[org.slug];
    if (!meta) continue;

    for (const m of TEAM) {
      const clerkId = `demo_${org.slug}_${m.slug}`;
      const email = `${m.slug}@${meta.domain}`;
      const name = `${m.first} ${m.last}`;
      await sql`
        INSERT INTO users (
          clerk_id, org_id, role, name, email,
          meeting_duration_minutes, meeting_location
        )
        VALUES (
          ${clerkId}, ${org.id}, 'member', ${name}, ${email},
          30, ${meta.location}
        )
      `;
      console.log(`  ✓ ${org.slug.padEnd(12)} ${name}`);
    }
  }

  console.log("Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
