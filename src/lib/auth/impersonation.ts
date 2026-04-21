import { cookies } from "next/headers";

/**
 * Back-office impersonation lets a staff user view the client portal
 * exactly as a specific client sees it.
 *
 * Design:
 *   - Opt-in, cookie-driven. The staff member explicitly starts
 *     impersonation from /back-office/portals and can exit at any time.
 *   - Scoped to the client's own org: getPortalContext verifies the
 *     impersonated contact belongs to the staff member's active org
 *     before honoring the cookie. This enforces the "any staff in the
 *     client's org" access rule.
 *   - Short-lived. The cookie expires after 4 hours so that a forgotten
 *     impersonation session doesn't linger indefinitely. Staff can also
 *     explicitly exit from the impersonation banner.
 */

const IMPERSONATION_COOKIE = "pb_impersonate_contact_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

/** Read the current impersonation target contact id, if any. */
export async function getImpersonatedContactId(): Promise<string | null> {
  const store = await cookies();
  return store.get(IMPERSONATION_COOKIE)?.value ?? null;
}

/** Begin impersonating the given contact. */
export async function setImpersonatedContactCookie(
  contactId: string,
): Promise<void> {
  const store = await cookies();
  store.set(IMPERSONATION_COOKIE, contactId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

/** Stop any active impersonation. */
export async function clearImpersonatedContactCookie(): Promise<void> {
  const store = await cookies();
  store.delete(IMPERSONATION_COOKIE);
}
