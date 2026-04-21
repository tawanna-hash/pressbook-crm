import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, organizations, users } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { getPortalRole } from "@/lib/auth/role";
import { getImpersonatedContactId } from "@/lib/auth/impersonation";

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
 * Resolve the current Clerk user into a portal role + org.
 *
 * - **client** → matched by `contacts.clerkId`; org is the contact's org
 * - **staff**  → matched by `users.clerkId`; org is the staff member's
 *                active org (pulled from the usual active-org cookie) so
 *                the preview shows the same company the staff member is
 *                working with in /dashboard
 * - **unknown** → signed in but no matching contact or staff row
 */
export async function getPortalContext(): Promise<PortalContext> {
  const user = await currentUser();
  if (!user) return { role: "unauthenticated" };

  const clerkId = user.id;
  const clerkEmail = user.primaryEmailAddress?.emailAddress ?? "";

  // 1) Client?
  const clientRows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.clerkId, clerkId)))
    .limit(1);
  if (clientRows[0]) {
    const contact = clientRows[0];
    const orgRows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, contact.orgId))
      .limit(1);
    const org = orgRows[0];
    if (!org) return { role: "unknown", clerkId, clerkEmail };
    return { role: "client", clerkId, clerkEmail, contact, org };
  }

  // 2) Staff? Use role helper first so explicit metadata wins over row
  // presence (admins could be staff without a users row yet).
  const role = await getPortalRole();
  if (role === "staff") {
    const activeOrg = await getActiveOrg();
    if (!activeOrg) return { role: "unknown", clerkId, clerkEmail };
    const staffRows = await db
      .select()
      .from(users)
      .where(and(eq(users.clerkId, clerkId), eq(users.orgId, activeOrg.id)))
      .limit(1);
    // Use the users row if present; otherwise synthesize a stub so the
    // portal preview still works for admin-only users.
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

  return { role: "unknown", clerkId, clerkEmail };
}

/** Human-readable address lines for the portal Location card. */
export function formatAgencyAddress(org: typeof organizations.$inferSelect): string[] {
  const line1 = [org.address, org.address2].filter(Boolean).join(", ");
  const line2 = [org.city, org.state, org.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean);
}
