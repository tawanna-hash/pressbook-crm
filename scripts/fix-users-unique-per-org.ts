/**
 * One-time migration: change the `users` table so a single Clerk user can
 * have a row in each org they belong to. Previously clerk_id was unique
 * across the whole table, which meant Tawanna (one Clerk account, two orgs)
 * could only have a row in one org — and every server action that looked up
 * her row by (clerk_id, org_id) would fail in the other org.
 *
 * After this migration:
 *   - The old clerk_id-only UNIQUE constraint is dropped.
 *   - A composite UNIQUE (clerk_id, org_id) takes its place.
 *
 * Run: npx tsx scripts/fix-users-unique-per-org.ts
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
  console.log("Fixing users unique constraint → per-org…");

  // Find and drop any single-column UNIQUE constraint on clerk_id. We don't
  // hardcode the name because Drizzle / Postgres may have generated one
  // we can't predict (e.g. users_clerk_id_unique, users_clerk_id_key, …).
  const dropped = await sql`
    DO $$
    DECLARE
      cname text;
    BEGIN
      SELECT tc.constraint_name INTO cname
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_name = ccu.table_name
      WHERE tc.table_name = 'users'
        AND tc.constraint_type = 'UNIQUE'
        AND ccu.column_name = 'clerk_id'
      GROUP BY tc.constraint_name
      HAVING COUNT(*) = 1
      LIMIT 1;

      IF cname IS NOT NULL THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(cname);
        RAISE NOTICE 'Dropped old unique constraint: %', cname;
      ELSE
        RAISE NOTICE 'No single-column unique constraint on clerk_id found — nothing to drop.';
      END IF;
    END $$;
  `;
  void dropped;

  // Add the composite unique (idempotent — drop first if it exists).
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_clerk_id_org_id_unique`;
  await sql`ALTER TABLE users ADD CONSTRAINT users_clerk_id_org_id_unique UNIQUE (clerk_id, org_id)`;

  console.log("✅ Done. Each Clerk user can now have one row per org.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
