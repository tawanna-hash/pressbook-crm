// src/app/api/admin/export-agreements/route.ts
//
// Read-only export endpoint used by the Caxton CRM importer. Returns
// every row of the `agreements` table joined with a denormalized
// snapshot of its parent `contacts` row (so the importer does not need
// a second round-trip to identify advertisers by email/company).
//
// Auth: `Authorization: Bearer $CRON_SECRET`. Re-uses the same secret
// the cron endpoints accept since there is no separate service token
// in this project and this route is read-only.
//
// Response shape:
//   { exported_at, count, agreements: Array<AgreementExportRow> }

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET env var is not set." },
      { status: 500 },
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    // Single SQL pass — agreements + denormalized contact snapshot +
    // attachments (first non-null data_url wins) so the importer can
    // populate Caxton's `signed_document` legacy slot without a second
    // call.
    const rows = await db.execute<Record<string, unknown>>(sql`
      SELECT
        ag.id,
        ag.org_id,
        ag.contact_id,
        ag.type,
        ag.status::text                   AS status,
        ag.start_date,
        ag.end_date,
        ag.amount,
        ag.ad_rate,
        ag.ad_timing,
        ag.ad_size,
        ag.frequency,
        ag.company_name,
        ag.rep_name,
        ag.advertiser_email,
        ag.advertiser_phone,
        ag.advertiser_address,
        ag.sign_date,
        ag.exp_date,
        ag.renewal_notice_date,
        ag.signed_at,
        ag.signed_document,
        ag.sent_to_email,
        ag.is_uploaded,
        ag.billing_name,
        ag.billing_email,
        ag.payment_mode,
        ag.stripe_customer_id,
        ag.stripe_invoice_id,
        ag.stripe_payment_intent_id,
        ag.stripe_payment_link_url,
        ag.paid_at,
        ag.audit_log,
        ag.eblast_packages,
        ag.notes,
        ag.created_at,
        ag.updated_at,
        c.first_name                      AS contact_first_name,
        c.last_name                       AS contact_last_name,
        c.email                           AS contact_email,
        c.phone                           AS contact_phone,
        c.office_phone                    AS contact_office_phone,
        c.company                         AS contact_company,
        c.address                         AS contact_address,
        c.address_2                       AS contact_address_2,
        c.city                            AS contact_city,
        c.state                           AS contact_state,
        c.zip                             AS contact_zip,
        (
          SELECT json_agg(att ORDER BY att.uploaded_at)
          FROM (
            SELECT id, filename, mime_type, size_bytes, data_url, uploaded_at
            FROM agreement_attachments
            WHERE agreement_id = ag.id
          ) att
        )                                  AS attachments
      FROM agreements ag
      LEFT JOIN contacts c ON c.id = ag.contact_id
      ORDER BY ag.created_at ASC
    `);

    return NextResponse.json({
      ok: true,
      exported_at: new Date().toISOString(),
      count: rows.length,
      agreements: rows,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/export-agreements] failed:", msg);
    return NextResponse.json(
      { ok: false, message: msg },
      { status: 500 },
    );
  }
}
