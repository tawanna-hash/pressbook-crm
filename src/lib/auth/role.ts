import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Portal roles in PressBook 360.
 *
 * - "staff"  → internal team (RealtyLine / Newsline SA employees) — sees the CRM.
 * - "client" → external customer logging into their client portal.
 *
 * Role is read from Clerk `publicMetadata.portalRole`. If it's not set, we
 * fall back to email-domain inference: anyone on our company domains is staff,
 * everyone else is a client. This lets us onboard clients without manually
 * setting a role in Clerk, while staff members can be promoted by setting
 * `publicMetadata.portalRole = "staff"` in the Clerk dashboard.
 */
export type PortalRole = "staff" | "client";

const STAFF_DOMAINS = [
  "myrealtyline.com",
  "newslinesa.com",
  "caxtonpublications.com",
];

function inferRoleFromEmail(email: string | undefined | null): PortalRole {
  if (!email) return "client";
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return "client";
  return STAFF_DOMAINS.includes(domain) ? "staff" : "client";
}

/**
 * Get the current user's portal role. Returns `null` if not signed in.
 * Use this in server components and route handlers.
 */
export async function getPortalRole(): Promise<PortalRole | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  // 1) Explicit role in Clerk metadata wins.
  const explicit = user.publicMetadata?.portalRole;
  if (explicit === "staff" || explicit === "client") {
    return explicit;
  }

  // 2) Fall back to inferring from the primary email domain.
  const primaryEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress;
  return inferRoleFromEmail(primaryEmail);
}

/**
 * Shortcut: redirect target for a freshly-signed-in user.
 */
export function rolePathFor(role: PortalRole): string {
  return role === "staff" ? "/app" : "/portal";
}
