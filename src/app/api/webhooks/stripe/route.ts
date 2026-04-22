import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { agreements } from "@/lib/db/schema";

/**
 * Stripe webhook endpoint.
 *
 * Today it handles `checkout.session.completed` — the event fired when
 * a client finishes paying an agreement via the portal Pay Now button.
 * We use the session's `metadata.agreementId` (set by
 * `/portal/billing/actions.ts > startAgreementCheckout`) to flip the
 * matching agreement's `paidAt` column and record the payment intent id
 * + a line in `auditLog`.
 *
 * Other events are acknowledged but ignored until we wire them up.
 *
 * Stripe signature verification requires the raw request body (not
 * parsed JSON), so we read it as text before handing to `constructEvent`.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !apiKey) {
    // Webhook hit but server isn't configured — acknowledge so Stripe
    // doesn't retry forever, but log loudly.
    console.warn("[stripe webhook] missing STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY");
    return NextResponse.json({ received: true, configured: false });
  }

  const stripe = new Stripe(apiKey);

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.warn("[stripe webhook] signature verification failed:", msg);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object);
        break;
      }
      default:
        // Event we don't care about yet — just ack.
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    // Respond 200 anyway — Stripe will retry on non-2xx, which we don't
    // want if the event already flipped the DB. Handler-level idempotency
    // (paidAt only set if currently null) keeps retries safe.
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const agreementId = session.metadata?.agreementId;
  if (!agreementId) {
    console.warn("[stripe webhook] checkout.session.completed without agreementId metadata");
    return;
  }

  // Only mark paid if Stripe says so. For `payment` mode the canonical
  // sign is payment_status === "paid".
  if (session.payment_status !== "paid") {
    console.info(
      `[stripe webhook] session ${session.id} not paid (${session.payment_status}); skipping`,
    );
    return;
  }

  // Read current state so we can (a) enforce idempotency and (b) append
  // the audit log entry without clobbering existing entries.
  const [row] = await db
    .select({
      id: agreements.id,
      orgId: agreements.orgId,
      paidAt: agreements.paidAt,
      auditLog: agreements.auditLog,
    })
    .from(agreements)
    .where(eq(agreements.id, agreementId))
    .limit(1);

  if (!row) {
    console.warn(`[stripe webhook] no agreement with id ${agreementId}`);
    return;
  }

  if (row.paidAt) {
    // Duplicate delivery — already marked paid.
    return;
  }

  const paidAt = new Date();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const invoiceId =
    typeof session.invoice === "string"
      ? session.invoice
      : session.invoice?.id ?? null;

  const nextAudit = [
    ...(row.auditLog ?? []),
    {
      event: "payment.received",
      timestamp: paidAt.toISOString(),
      details: `Stripe checkout session ${session.id}${
        paymentIntentId ? ` (pi ${paymentIntentId})` : ""
      }`,
    },
  ];

  await db
    .update(agreements)
    .set({
      paidAt,
      stripePaymentIntentId: paymentIntentId ?? undefined,
      // Only overwrite stripeInvoiceId if Stripe gave us a real one;
      // otherwise leave whatever is there alone.
      ...(invoiceId ? { stripeInvoiceId: invoiceId } : {}),
      auditLog: nextAudit,
      updatedAt: paidAt,
    })
    .where(eq(agreements.id, agreementId));

  revalidatePath("/portal/billing");
  revalidatePath(`/agreements/${agreementId}`);
  revalidatePath("/agreements");
}
