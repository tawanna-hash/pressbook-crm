/**
 * Extend agreements with columns needed for the three new flows:
 *   - signed_document  (text)        base64 data URL of uploaded signed PDF/image
 *   - signed_at        (timestamp)   when the signed copy was uploaded
 *   - sent_to_email    (varchar 255) email the agreement was sent to (Email flow)
 *
 * Run: npx tsx scripts/add-agreement-attachments.ts
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
  console.log("Extending agreements table…");
  await sql`
    ALTER TABLE agreements
    ADD COLUMN IF NOT EXISTS signed_document TEXT,
    ADD COLUMN IF NOT EXISTS signed_at       TIMESTAMP,
    ADD COLUMN IF NOT EXISTS sent_to_email   VARCHAR(255)
  `;
  console.log("✅ Done.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("❌", err);
  await sql.end();
  process.exit(1);
});
