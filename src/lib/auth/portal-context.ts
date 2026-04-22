import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, organizations, users } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { getPortalRole } from "@/lib/auth/role";
import { getImpersonatedContactId } from "@/lib/auth/impersonation";
import { getValidPortalSession } from "@/lib/auth/portal-session";

/**
 * Describes an active back-office impersonation session — when a staff
 * member is viewing the portal AS a specific client. Used by the portal
 * layout to show a clear banner and exit control.
 */
export type ImpersonationMarker = {
  actorClerkId: string;
  actorEmail: string;
  actorName: string | null;
};

export type PortalContext =
  | {
      role: "client";
      /** Empty for magic-link clients — they don't have Clerk accounts. */
      clerkId: string;
      clerkEmail: string;
      contact: typeof contacts.$inferSelect;
      org: typeof organizations.$inferSelect;
      /** Present when a staff member is impersonating this client. */
      impersonation?: ImpersonationMarker;
    }
  | {
      role: "staff";
      clerkId: string;
      clerkEmail: string;
      user: typeof users.$inferSelect;
      org: typeof organizations.$inferSelect;
    }
  | {
      role: "unauthenticated";
    }
  | {
      role: "unknown";
      clerkId: string;
      clerkEmail: string;
    };

/**
 * Resolve the current request into a portal role + org.
 *
 * Clients never create accounts — they authenticate via a single-use
 * magic-link session cookie (see lib/auth/portal-session.ts). Staff
 * still authenticate via Clerk. Resolution order:
 *
 *   1. Clerk user present AND marked staff → staff context. If the
 *      staff has started back-office impersonation of a client in their
 *      active org, we return a "client" context pointing at that
 *      contact with an `impersonation` marker.
 *   2. No Clerk user, but a valid magic-link portal session cookie →
 *      client context keyed to that contact.
 *   3. Otherwise → unauthenticated (or "unknown" if a Clerk user exists
 *      but is neither staff nor impersonating anyone).
 */
export async function getPortalContext(): Promise<PortalContext> {
  const user = await currentUser();

  // ── Staff path (Clerk) ───────────────────────────────────────
  if (user) {
    const clerkId = user.id;
    const clerkEmail = user.primaryEmailAddress?.emailAddress ?? "";

    const role = await getPortalRole();
    if (role === "staff") {
      const activeOrg = await getActiveOrg();
      if (!activeOrg) return { role: "unknown", clerkId, clerkEmail };

      const staffRows = await db
        .select()
        .from(users)
        .where(and(eq(users.clerkId, clerkId), eq(users.orgId, activeOrg.id)))
        .limit(1);

      const u = staffRows[0] ?? {
        id: clerkId,
        clerkId,
        orgId: activeOrg.id,
        role: "admin" as const,
        name: user.fullName ?? clerkEmail,
        email: clerkEmail,
        avatarUrl: user.imageUrl ?? null,
        publicBookingUrl: null,
        meetingDurationMinutes: 30,
        meetingLocation: null,
        bookingBio: null,
        createdAt: new Date(),
      };

      const orgRows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, activeOrg.id))
        .limit(1);
      const org = orgRows[0];
      if (!org) return { role: "unknown", clerkId, clerkEmail };

      // Back-office impersonation: if the staff member has started
      // impersonating a specific client, return a "client" context keyed
      // to that contact — but only if the contact lives in the staff's
      // active org. Otherwise ignore a stale cookie and fall back to the
      // normal staff preview.
      const impersonatedId = await getImpersonatedContactId();
      if (impersonatedId) {
        const [target] = await db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.id, impersonatedId),
              eq(contacts.orgId, activeOrg.id),
            ),
          )
          .limit(1);
        if (target) {
          return {
            role: "client",
            clerkId,
            clerkEmail,
            contact: target,
            org,
            impersonation: {
              actorClerkId: clerkId,
              actorEmail: clerkEmail,
              actorName: u.name ?? null,
            },
          };
        }
      }

      return { role: "staff", clerkId, clerkEmail, user: u, org };
    }

    // Signed-in Clerk user who isn't staff — we no longer treat any
    // Clerk user as a client (clients use magic links now). Fall
    // through to the magic-link path below; if they also have a valid
    // portal session cookie that resolves, great — otherwise "unknown".
  }

  // ── Client path (magic-link session) ─────────────────────────
  const session = await getValidPortalSession();
  if (session) {
    return {
      role: "client",
      clerkId: "",
      clerkEmail: session.contact.portalEmail ?? session.contact.email ?? "",
      contact: session.contact,
      org: session.org,
    };
  }

  if (user) {
    return {
      role: "unknown",
      clerkId: user.id,
      clerkEmail: user.primaryEmailAddress?.emailAddress ?? "",
    };
  }

  return { role: "unauthenticated" };
}

/** Human-readable address lines for the portal Location card. */
export function formatAgencyAddress(org: typeof organizations.$inferSelect): string[] {
  const line1 = [org.address, org.address2].filter(Boolean).join(", ");
  const line2 = [org.city, org.state, org.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean);
}
