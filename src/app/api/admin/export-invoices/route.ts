// src/app/api/admin/export-invoices/route.ts
//
// Read-only export endpoint used by the Caxton CRM importer. Returns
// every row of the `invoices` table joined with a denormalized snapshot
// of its parent `contacts` row.
//
// Auth: `Authorization: Bearer $CRON_SECRET`.

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
    const rows = await db.execute<Record<string, unknown>>(sql`
      SELECT
        i.id,
        i.org_id,
        i.agreement_id,
        i.contact_id,
        i.amount,
        i.status::text          AS status,
        i.stripe_invoice_id,
        i.due_date,
        i.paid_at,
        i.created_at,
        c.first_name            AS contact_first_name,
        c.last_name             AS contact_last_name,
        c.email                 AS contact_email,
        c.phone                 AS contact_phone,
        c.company               AS contact_company,
        c.address               AS contact_address,
        c.address_2             AS contact_address_2,
        c.city                  AS contact_city,
        c.state                 AS contact_state,
        c.zip                   AS contact_zip
      FROM invoices i
      LEFT JOIN contacts c ON c.id = i.contact_id
      ORDER BY i.created_at ASC
    `);

    return NextResponse.json({
      ok: true,
      exported_at: new Date().toISOString(),
      count: rows.length,
      invoices: rows,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/export-invoices] failed:", msg);
    return NextResponse.json(
      { ok: false, message: msg },
      { status: 500 },
    );
  }
}
