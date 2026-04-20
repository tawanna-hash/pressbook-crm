/**
 * Ensure RealtyLine (Austin) and Newsline SA (San Antonio) both exist as
 * organizations. Run once per environment.
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const ORGS = [
  { slug: "realtyline", name: "RealtyLine",  brandColor: "#021D40" },
  { slug: "newsline",   name: "Newsline SA", brandColor: "#3D0740" },
];

async function main() {
  for (const org of ORGS) {
    const [row] = await sql<{ id: string; name: string; slug: string }[]>`
      INSERT INTO organizations (name, slug, brand_color, plan)
      VALUES (${org.name}, ${org.slug}, ${org.brandColor}, 'free')
      ON CONFLICT (slug) DO UPDATE SET
        name        = EXCLUDED.name,
        brand_color = EXCLUDED.brand_color
      RETURNING id, name, slug
    `;
    console.log(`  ✓ ${row.slug.padEnd(12)} ${row.name}`);
  }
  console.log("Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
