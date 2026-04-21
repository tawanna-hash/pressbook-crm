/**
 * Cron endpoint — syncs every org's active clients (and their Additional
 * Contacts 2/3) onto the Advertisers mailing list. Designed to be called
 * once a minute by a platform scheduler (Vercel Cron, DO App Platform
 * scheduled job, GitHub Actions, or any external cron service).
 *
 * Auth: Bearer token from the CRON_SECRET env var. If CRON_SECRET is
 * unset, requests are rejected with 500 so we never silently accept
 * unauthenticated traffic in production.
 *
 * Example:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://<host>/api/cron/sync-advertisers
 */

import { NextResponse } from "next/server";
import { syncActiveClientsAllOrgs } from "@/app/(dashboard)/mailing/sync-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET env var is not set." },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Vercel Cron also passes the secret via a `x-vercel-cron` header but the
  // authorization check below covers both Vercel and external schedulers.
  if (auth !== expected) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  const started = Date.now();
  try {
    const result = await syncActiveClientsAllOrgs();
    const durationMs = Date.now() - started;
    return NextResponse.json({
      ok: true,
      durationMs,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron sync-advertisers] failed:", message);
    return NextResponse.json(
      { ok: false, message },
      { status: 500 },
    );
  }
}

// Support POST too so platforms that only issue POST work without config.
export async function POST(request: Request) {
  return GET(request);
}
