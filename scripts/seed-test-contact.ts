/**
 * Seed a test organization + contact so you can exercise the client portal flow.
 *
 * Usage:
 *   npx tsx scripts/seed-test-contact.ts <email> [first_name] [last_name]
 *
 * Examples:
 *   npx tsx scripts/seed-test-contact.ts test.client@gmail.com
 *   npx tsx scripts/seed-test-contact.ts jane@example.com Jane Doe
 *
 * After running this, sign up for the portal at http://localhost:3000/sign-up
 * using the same email, and you should be auto-linked to the contact.
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set — check .env.local");
  process.exit(1);
}

const [rawEmail, firstName = "Test", lastName = "Client"] =
  process.argv.slice(2);

if (!rawEmail) {
  console.error(
    "Usage: npx tsx scripts/seed-test-contact.ts <email> [first_name] [last_name]",
  );
  process.exit(1);
}

const email = rawEmail.toLowerCase();
const sql = postgres(url, { max: 1 });

async function main() {
  console.log("1/3  Ensuring RealtyLine organization exists...");
  const [org] = await sql<{ id: string; name: string }[]>`
    INSERT INTO organizations (name, slug, brand_color, plan)
    VALUES ('RealtyLine', 'realtyline', '#021D40', 'free')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
  `;
  console.log(`     ✓ Org: ${org.name} (${org.id})`);

  console.log(`2/3  Upserting contact with email ${email}...`);
  const [contact] = await sql<{ id: string; email: string }[]>`
    INSERT INTO contacts (org_id, type, first_name, last_name, email)
    VALUES (${org.id}, 'client', ${firstName}, ${lastName}, ${email})
    ON CONFLICT DO NOTHING
    RETURNING id, email
  `;

  if (contact) {
    console.log(`     ✓ Created contact: ${contact.email} (${contact.id})`);
  } else {
    const existing = await sql<{ id: string; email: string; clerk_id: string | null }[]>`
      SELECT id, email, clerk_id FROM contacts
      WHERE lower(email) = ${email} LIMIT 1
    `;
    if (existing[0]) {
      const linked = existing[0].clerk_id ? " (already linked to a Clerk user)" : "";
      console.log(`     • Contact already exists: ${existing[0].email}${linked}`);
    } else {
      console.log("     • No contact returned and none found — weird, check schema.");
    }
  }

  console.log("3/3  Done.");
  console.log("");
  console.log("Next:");
  console.log(`  1. Go to http://localhost:3000/sign-up`);
  console.log(`  2. Sign up with email: ${email}`);
  console.log(`  3. You'll land on /portal with the contact linked`);
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await sql.end();
  process.exit(1);
});
