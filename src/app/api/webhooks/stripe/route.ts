import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO Phase 1: Verify Stripe signature and handle invoice events
  const body = await req.text();
  console.log("[stripe webhook] received", body.length, "bytes");
  return NextResponse.json({ received: true });
}
