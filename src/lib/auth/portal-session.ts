import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, organizations, portalMagicLinks } from "@/lib/db/schema";

/**
 * Passwordless client portal sessions.
 *
 * Flow:
 *   1. Staff calls `createMagicLink(contactId, actorId)` — a row is
 *      inserted with a fresh token, `link_expires_at = now + 24h`.
 *   2. We email the client a URL: ${PORTAL_URL}/portal/enter?token=${token}
 *   3. Client clicks. `consumeMagicLink(token)` validates + marks the
 *      row consumed (`consumed_at = now`, `session_expires_at = now + 4h`)
 *      AND sets the `pb_portal_session` cookie to the same token.
 *   4. Every subsequent portal request calls `getValidPortalSession()`
 *      which reads the cookie, confirms the row is still "alive"
 *      (consumed, not past session_expires_at), and returns the contact.
 *
 * "Single visit" behavior:
 *   - Link token is one-shot: a second click on the same URL fails.
 *   - Session cookie has NO Max-Age — it dies when the browser closes.
 *   - Server-side expiry (4h) is enforced independently, so even a
 *     persisted cookie goes stale quickly.
 *   - To come back another day, client needs a fresh link from staff.
 */

const PORTAL_SESSION_COOKIE = "pb_portal_session";
const LINK_TTL_MS = 24 * 60 * 60 * 1000;    // 24h to click the emailed link
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;  // 4h active session after click

export type CreateMagicLinkResult = {
  token: string;
  url: string;
  expiresAt: Date;
};

export type ConsumeResult =
  | { ok: true; contactId: string; orgId: string }
  | {
      ok: false;
      reason: "not_found" | "link_expired" | "already_consumed";
    };

export type PortalSession = {
  token: string;
  contact: typeof contacts.$inferSelect;
  org: typeof organizations.$inferSelect;
  sessionExpiresAt: Date;
};

/**
 * Generate a URL-safe random token. 32 bytes of entropy → 43 chars
 * after base64url encoding (without padding).
 */
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Build the absolute URL a client clicks. Prefers NEXT_PUBLIC_SITE_URL,
 * then VERCEL_URL, then localhost for dev.
 */
function siteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * Insert a fresh magic-link row for a contact. Caller (staff) is recorded
 * for audit. Returns the full click-through URL and the token itself.
 */
export async function createMagicLink(params: {
  orgId: string;
  contactId: string;
  createdByUserId?: string | null;
}): Promise<CreateMagicLinkResult> {
  const token = generateToken();
  const now = new Date();
  const linkExpiresAt = new Date(now.getTime() + LINK_TTL_MS);

  await db.insert(portalMagicLinks).values({
    orgId: params.orgId,
    contactId: params.contactId,
    token,
    linkExpiresAt,
    createdByUserId: params.createdByUserId ?? null,
  });

  const url = `${siteBaseUrl()}/portal/enter?token=${token}`;
  return { token, url, expiresAt: linkExpiresAt };
}

/**
 * Validate and consume a link token. On success, set the session cookie.
 * `userAgent` / `ipAddress` are captured for audit (optional).
 */
export async function consumeMagicLink(token: string): Promise<ConsumeResult> {
  const now = new Date();

  const [row] = await db
    .select()
    .from(portalMagicLinks)
    .where(eq(portalMagicLinks.token, token))
    .limit(1);

  if (!row) return { ok: false, reason: "not_found" };
  if (row.consumedAt) return { ok: false, reason: "already_consumed" };
  if (row.linkExpiresAt.getTime() < now.getTime()) {
    return { ok: false, reason: "link_expired" };
  }

  const sessionExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  // Capture request metadata for audit. `headers()` is async in Next 16.
  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent") ?? null;
  const ipHeader =
    hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? null;
  const ipAddress = ipHeader ? ipHeader.split(",")[0].trim().slice(0, 45) : null;

  await db
    .update(portalMagicLinks)
    .set({
      consumedAt: now,
      sessionExpiresAt,
      userAgent,
      ipAddress,
    })
    .where(eq(portalMagicLinks.id, row.id));

  const store = await cookies();
  store.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // No Max-Age / expires — session cookie dies on browser close.
  });

  return { ok: true, contactId: row.contactId, orgId: row.orgId };
}

/**
 * Read the portal session cookie and verify it still points to a live
 * consumed-and-unexpired row. Returns the contact + org on success.
 */
export async function getValidPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  const token = store.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const [row] = await db
    .select({
      link: portalMagicLinks,
      contact: contacts,
      org: organizations,
    })
    .from(portalMagicLinks)
    .innerJoin(contacts, eq(contacts.id, portalMagicLinks.contactId))
    .innerJoin(organizations, eq(organizations.id, portalMagicLinks.orgId))
    .where(eq(portalMagicLinks.token, token))
    .limit(1);

  if (!row) return null;
  if (!row.link.consumedAt) return null;
  if (!row.link.sessionExpiresAt) return null;
  if (row.link.sessionExpiresAt.getTime() < now.getTime()) return null;

  return {
    token,
    contact: row.contact,
    org: row.org,
    sessionExpiresAt: row.link.sessionExpiresAt,
  };
}

/** Explicit sign-out: clear the session cookie. */
export async function clearPortalSession(): Promise<void> {
  const store = await cookies();
  store.delete(PORTAL_SESSION_COOKIE);
}

/**
 * Used by /portal/enter's error UI — returns a tiny bit of state about
 * the link without consuming it, so we can show a tailored message.
 */
export async function peekMagicLink(token: string): Promise<
  | { status: "ok" }
  | { status: "not_found" | "link_expired" | "already_consumed" }
> {
  const [row] = await db
    .select({
      consumedAt: portalMagicLinks.consumedAt,
      linkExpiresAt: portalMagicLinks.linkExpiresAt,
    })
    .from(portalMagicLinks)
    .where(eq(portalMagicLinks.token, token))
    .limit(1);
  if (!row) return { status: "not_found" };
  if (row.consumedAt) return { status: "already_consumed" };
  if (row.linkExpiresAt.getTime() < Date.now()) return { status: "link_expired" };
  return { status: "ok" };
}

