"use server";

import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { agreements } from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";

export type CheckoutResult = {
  ok: boolean;
  url?: string;
  message?: string;
};

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("REPLACE_ME")) return null;
  return new Stripe(key);
}

export async function startAgreementCheckout(
  agreementId: string,
): Promise<CheckoutResult> {
  const ctx = await getPortalContext();
  if (ctx.role !== "client" && ctx.role !== "staff") {
    return { ok: false, message: "Not authorized." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      message: "Stripe isn't configured — add STRIPE_SECRET_KEY.",
    };
  }

  const rows = await db
    .select()
    .from(agreements)
    .where(and(
      eq(agreements.id, agreementId),
      eq(agreements.orgId, ctx.org.id),
    ))
    .limit(1);
  const a = rows[0];
  if (!a) return { ok: false, message: "Agreement not found." };

  const cents = a.adRate ?? a.amount;
  if (!cents || cents <= 0) {
    return { ok: false, message: "This agreement has no amount set." };
  }

  const productName =
    [a.companyName, a.adSize, a.frequency].filter(Boolean).join(" · ") ||
    "Advertising Agreement";

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents,
          product_data: {
            name: productName,
            description: a.notes?.slice(0, 200) || undefined,
          },
        },
      },
    ],
    success_url: `${origin}/portal/billing?paid=${agreementId}`,
    cancel_url: `${origin}/portal/billing`,
    metadata: {
      agreementId,
      orgId: ctx.org.id,
      role: ctx.role,
    },
    customer_email: ctx.role === "client" ? ctx.contact.email ?? undefined : undefined,
  });

  return { ok: true, url: session.url ?? undefined };
}
