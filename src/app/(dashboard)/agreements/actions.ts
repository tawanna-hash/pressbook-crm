"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  agreementAttachments,
  agreements,
  contacts,
  users,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import {
  AGREEMENT_STATUSES,
  computeExpDate,
  monthsForFrequency,
  renewalNoticeDate,
  type AgreementStatus,
  type PaymentMode,
} from "./options";

type SimpleResult = { ok: true; id?: string } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────
// Parsing helpers
// ─────────────────────────────────────────────────────────────

function parseDollarsToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/[$,\s]/g, "");
  if (trimmed === "") return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid amount: "${raw}"`);
  }
  const [whole, frac = ""] = trimmed.split(".");
  const cents =
    Number.parseInt(whole, 10) * 100 +
    Number.parseInt(frac.padEnd(2, "0"), 10) * (whole.startsWith("-") ? -1 : 1);
  return cents;
}

function parseDateField(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: "${raw}"`);
  return d;
}

function readStatus(raw: string): AgreementStatus {
  const s = raw.trim() as AgreementStatus;
  return AGREEMENT_STATUSES.includes(s) ? s : "draft";
}

function readPaymentMode(raw: string): PaymentMode | null {
  const s = raw.trim() as PaymentMode;
  if (s === "card" || s === "link" || s === "invoice" || s === "check") return s;
  return null;
}

function readJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* ignore */
  }
  return [];
}

async function currentUserEmail(): Promise<string | undefined> {
  const u = await currentUser();
  if (!u) return undefined;
  return (
    u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
      ?.emailAddress ?? undefined
  );
}

// ─────────────────────────────────────────────────────────────
// Core CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Create a new agreement. Supports all three flows via `flow`:
 *   - "upload"  → status=signed, signedAt=now, is_uploaded=true
 *   - "email"   → status=sent, sentToEmail required, payment plumbing populated
 *   - "print"   → status=draft
 *   - (omitted) → status from form, no flow side effects (used for edits)
 */
export async function createAgreement(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org." };

    // ── Core fields ──
    const contactIdRaw = String(formData.get("contactId") ?? "").trim();
    const contactId = contactIdRaw === "" ? null : contactIdRaw;
    if (contactId) {
      const [row] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.orgId, org.id)))
        .limit(1);
      if (!row) return { ok: false, error: "That client isn't in this org." };
    }

    // Advertiser identity (if no contact selected, at least require company)
    const companyName =
      String(formData.get("companyName") ?? "").trim() || null;
    const repName = String(formData.get("repName") ?? "").trim() || null;
    const advertiserEmail =
      String(formData.get("advertiserEmail") ?? "").trim().toLowerCase() || null;
    const advertiserPhone =
      String(formData.get("advertiserPhone") ?? "").trim() || null;
    const advertiserAddress =
      String(formData.get("advertiserAddress") ?? "").trim() || null;

    if (!contactId && !companyName) {
      return {
        ok: false,
        error: "Pick a client or enter a company name.",
      };
    }

    // Ad contract fields
    const type = String(formData.get("type") ?? "Advertising").trim() || null;
    const adSize = String(formData.get("adSize") ?? "").trim() || null;
    const frequency = String(formData.get("frequency") ?? "").trim() || null;
    const adRate = parseDollarsToCents(String(formData.get("adRate") ?? ""));
    const adTimingRaw = String(formData.get("adTiming") ?? "").trim();
    let adTiming: { months: string[]; years: number } | null = null;
    if (adTimingRaw) {
      try {
        const parsed = JSON.parse(adTimingRaw);
        if (parsed && Array.isArray(parsed.months)) {
          adTiming = {
            months: parsed.months.map(String),
            years: Number(parsed.years) || 1,
          };
        }
      } catch {
        /* ignore */
      }
    }

    const signDate = parseDateField(String(formData.get("signDate") ?? ""));
    const startDate = parseDateField(String(formData.get("startDate") ?? ""));
    // Auto-compute expDate/renewalNoticeDate if not provided.
    let expDate = parseDateField(String(formData.get("expDate") ?? ""));
    if (!expDate && signDate) {
      const months = adTiming?.months.length
        ? adTiming.months.length
        : monthsForFrequency(frequency ?? "12x");
      expDate = computeExpDate(signDate, months);
    }
    const renewalNotice = expDate ? renewalNoticeDate(expDate) : null;

    // Billing
    const billingName =
      String(formData.get("billingName") ?? "").trim() || null;
    const billingEmail =
      String(formData.get("billingEmail") ?? "").trim().toLowerCase() || null;
    const paymentMode = readPaymentMode(
      String(formData.get("paymentMode") ?? ""),
    );

    // Flow
    const flow = String(formData.get("flow") ?? "").trim().toLowerCase();
    let status = readStatus(String(formData.get("status") ?? "draft"));
    let signedAt: Date | null = null;
    let isUploaded = false;
    const sentToEmailRaw = String(formData.get("sentToEmail") ?? "")
      .trim()
      .toLowerCase();
    const sentToEmail =
      sentToEmailRaw && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sentToEmailRaw)
        ? sentToEmailRaw
        : null;

    if (flow === "upload") {
      status = "signed";
      signedAt = signDate ?? new Date();
      isUploaded = true;
    } else if (flow === "email") {
      if (!sentToEmail) {
        return { ok: false, error: "Send-to email is required for Email flow." };
      }
      status = "sent";
    } else if (flow === "print") {
      status = "draft";
    }

    const notes = String(formData.get("notes") ?? "").trim() || null;
    const eblastPackages = readJsonArray(
      String(formData.get("eblastPackages") ?? ""),
    );

    const actorEmail = await currentUserEmail();
    const auditLog = [
      {
        event:
          flow === "upload"
            ? "Agreement uploaded"
            : flow === "email"
              ? "Email agreement drafted"
              : flow === "print"
                ? "Print agreement drafted"
                : "Agreement created",
        timestamp: new Date().toISOString(),
        userEmail: actorEmail,
        details: companyName ?? undefined,
      },
    ];

    const [inserted] = await db
      .insert(agreements)
      .values({
        orgId: org.id,
        contactId,
        type,
        status,
        startDate,
        endDate: expDate, // mirror
        amount: adRate,   // convenience mirror
        notes,
        companyName,
        repName,
        advertiserEmail,
        advertiserPhone,
        advertiserAddress,
        adSize,
        frequency,
        adRate,
        adTiming,
        signDate,
        expDate,
        renewalNoticeDate: renewalNotice,
        billingName,
        billingEmail,
        paymentMode,
        sentToEmail,
        signedAt,
        isUploaded,
        auditLog,
        eblastPackages,
      })
      .returning({ id: agreements.id });

    // Attachments (multiple, as JSON payload from the client)
    const attachmentsRaw = String(formData.get("attachments") ?? "[]");
    try {
      const parsed = JSON.parse(attachmentsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const selfId = await selfUserId(org.id);
        await db.insert(agreementAttachments).values(
          parsed
            .filter(
              (a) =>
                typeof a === "object" &&
                a &&
                typeof a.dataUrl === "string" &&
                typeof a.filename === "string",
            )
            .map((a) => ({
              agreementId: inserted.id,
              filename: String(a.filename).slice(0, 500),
              mimeType: a.mimeType ? String(a.mimeType) : null,
              sizeBytes: Number.isFinite(a.sizeBytes) ? Number(a.sizeBytes) : null,
              dataUrl: String(a.dataUrl),
              uploadedBy: selfId,
            })),
        );
      }
    } catch {
      /* ignore attachments JSON errors */
    }

    // Email / Stripe side effects — STUBS. Real keys required.
    if (flow === "email") {
      // TODO: if process.env.STRIPE_SECRET_KEY → call Stripe
      // TODO: if process.env.RESEND_API_KEY    → send the drafted email
      // For now: the agreement is persisted; copyable link is shown in UI.
    }

    revalidatePath("/agreements");
    return { ok: true, id: inserted.id };
  } catch (e) {
    console.error("createAgreement failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Create failed.",
    };
  }
}

async function selfUserId(orgId: string): Promise<string | null> {
  const u = await currentUser();
  if (!u) return null;
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.clerkId, u.id), eq(users.orgId, orgId)))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Update an existing agreement. Same field surface as create; does not
 * change isUploaded or signedAt unless explicitly re-provided.
 */
export async function updateAgreement(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org." };
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Missing agreement id." };

    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only include fields the caller actually sent (empty-string-safe).
    const applyStr = (k: string) => {
      if (formData.has(k)) {
        const v = String(formData.get(k) ?? "").trim();
        patch[k] = v === "" ? null : v;
      }
    };
    const applyCents = (k: string) => {
      if (formData.has(k)) {
        patch[k] = parseDollarsToCents(String(formData.get(k) ?? ""));
      }
    };

    applyStr("companyName");
    applyStr("repName");
    applyStr("advertiserEmail");
    applyStr("advertiserPhone");
    applyStr("advertiserAddress");
    applyStr("adSize");
    applyStr("frequency");
    applyCents("adRate");
    applyStr("billingName");
    applyStr("billingEmail");
    if (formData.has("paymentMode")) {
      patch.paymentMode = readPaymentMode(
        String(formData.get("paymentMode") ?? ""),
      );
    }
    if (formData.has("status")) {
      patch.status = readStatus(String(formData.get("status") ?? "draft"));
    }
    if (formData.has("notes")) {
      patch.notes = String(formData.get("notes") ?? "").trim() || null;
    }
    if (formData.has("signDate")) {
      patch.signDate = parseDateField(String(formData.get("signDate") ?? ""));
    }
    if (formData.has("expDate")) {
      patch.expDate = parseDateField(String(formData.get("expDate") ?? ""));
    }

    await db
      .update(agreements)
      .set(patch)
      .where(and(eq(agreements.id, id), eq(agreements.orgId, org.id)));

    revalidatePath("/agreements");
    revalidatePath(`/agreements/${id}/print`);
    return { ok: true, id };
  } catch (e) {
    console.error("updateAgreement failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Update failed.",
    };
  }
}

export async function setAgreementStatus(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org." };
    const id = String(formData.get("id") ?? "").trim();
    const status = readStatus(String(formData.get("status") ?? ""));
    if (!id) return { ok: false, error: "Missing agreement id." };

    const patch: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "signed") patch.signedAt = new Date();

    await db
      .update(agreements)
      .set(patch)
      .where(and(eq(agreements.id, id), eq(agreements.orgId, org.id)));

    revalidatePath("/agreements");
    return { ok: true, id };
  } catch (e) {
    console.error("setAgreementStatus failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Status change failed.",
    };
  }
}

export async function deleteAgreement(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org." };
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Missing agreement id." };

    await db
      .delete(agreements)
      .where(and(eq(agreements.id, id), eq(agreements.orgId, org.id)));

    revalidatePath("/agreements");
    return { ok: true };
  } catch (e) {
    console.error("deleteAgreement failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Delete failed.",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Stripe + Email — STUBS (wire up when STRIPE_SECRET_KEY /
// RESEND_API_KEY are present in the environment).
// ─────────────────────────────────────────────────────────────

export async function sendAgreementEmail(
  formData: FormData,
): Promise<SimpleResult> {
  // Expected FormData: id (string)
  // Real impl would:
  //  1. Load the agreement + attachments
  //  2. If paymentMode === "card": use Stripe Elements clientSecret collected
  //     in the modal, confirmCardPayment, store paymentIntentId.
  //  3. If paymentMode === "link":   stripe.paymentLinks.create()
  //  4. If paymentMode === "invoice": stripe.invoices.create() + sendInvoice()
  //  5. Build email HTML with buildAgreementEmailHtml() (to be ported)
  //  6. Send via Resend / SES / SMTP
  //  7. Write auditLog entry: "Email sent to {sentToEmail}"
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing agreement id." };
  console.warn(
    "[sendAgreementEmail] stub — set STRIPE_SECRET_KEY + email sender to activate.",
  );
  revalidatePath("/agreements");
  return { ok: true, id };
}
