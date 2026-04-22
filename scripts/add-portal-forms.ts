/**
 * Migration — creates the `portal_forms` and `portal_form_assignments`
 * tables used by the client portal Forms Sharing feature.
 *
 * Idempotent; safe to re-run.
 *
 *   npx tsx scripts/add-portal-forms.ts
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const line = fs
      .readFileSync(envPath, "utf-8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim();
  }
  throw new Error(
    "DATABASE_URL is not set — export it or add it to .env.local.",
  );
}

async function main() {
  const url = loadDatabaseUrl();
  const sql = postgres(url, { ssl: "require", max: 1 });

  try {
    console.log("Creating portal_forms + portal_form_assignments…");

    await sql`
      CREATE TABLE IF NOT EXISTS portal_forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        fields JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by_user_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS portal_form_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id),
        form_id UUID NOT NULL REFERENCES portal_forms(id),
        contact_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'assigned',
        responses JSONB,
        assigned_by_user_id UUID,
        assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        submitted_at TIMESTAMP
      )
    `;

    // Helpful lookup indexes — scoped by the usual query shapes.
    await sql`
      CREATE INDEX IF NOT EXISTS portal_forms_org_idx
        ON portal_forms (org_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS portal_form_assignments_org_idx
        ON portal_form_assignments (org_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS portal_form_assignments_contact_idx
        ON portal_form_assignments (contact_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS portal_form_assignments_form_idx
        ON portal_form_assignments (form_id)
    `;

    console.log("Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
