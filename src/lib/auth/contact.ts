import { currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";

export type LinkedContact = typeof contacts.$inferSelect;

/**
 * Result of attempting to resolve a Clerk user to a CRM contact.
 *
 *  - status: "linked"     — a contact exists and is bound to this Clerk user
 *  - status: "not_found"  — signed in, but no matching contact in the CRM yet
 *                            (staff needs to add them before they can use the portal)
 *  - status: "signed_out" — no Clerk user in the request
 */
export type ContactResolution =
  | { status: "linked"; contact: LinkedContact }
  | { status: "not_found"; email: string | null }
  | { status: "signed_out" };

/**
 * Find or create the contact linkage for the currently signed-in Clerk user.
 *
 * Resolution strategy:
 *   1. If any contact has `clerk_id === userId`, return it (already linked).
 *   2. Else, look for a contact whose `email` matches the Clerk user's
 *      primary email AND doesn't yet have a `clerk_id`. If found, link it
 *      by setting `clerk_id` and `portal_activated_at`, then return.
 *   3. Else return `not_found`.
 *
 * We deliberately do NOT auto-create a new contact — staff must add the
 * contact to the CRM first. This keeps the client portal from being a
 * back door into the multi-tenant CRM.
 */
export async function resolveCurrentContact(): Promise<ContactResolution> {
  const user = await currentUser();
  if (!user) return { status: "signed_out" };

  // Fast path: already linked.
  const byClerkId = await db
    .select()
    .from(contacts)
    .where(eq(contacts.clerkId, user.id))
    .limit(1);

  if (byClerkId[0]) {
    return { status: "linked", contact: byClerkId[0] };
  }

  // Slow path: try to match by primary email.
  const primaryEmail = user.emailAddresses
    .find((e) => e.id === user.primaryEmailAddressId)
    ?.emailAddress?.toLowerCase();

  if (!primaryEmail) {
    return { status: "not_found", email: null };
  }

  const match = await db
    .select()
    .from(contacts)
    .where(
      and(
        // Case-insensitive match against either the primary email OR the
        // dedicated portal email — some clients log in with a different
        // address than their business email.
        sql`(lower(${contacts.email}) = ${primaryEmail} OR lower(${contacts.portalEmail}) = ${primaryEmail})`,
        isNull(contacts.clerkId),
        // Policy: only ACTIVE clients get portal access.
        // Prospects and inactive clients can't accidentally activate a
        // portal even if they sign up with a matching email.
        eq(contacts.status, "active"),
      ),
    )
    .limit(1);

  if (!match[0]) {
    return { status: "not_found", email: primaryEmail };
  }

  // Link the contact to this Clerk user.
  const [linked] = await db
    .update(contacts)
    .set({
      clerkId: user.id,
      portalActivatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, match[0].id))
    .returning();

  return { status: "linked", contact: linked };
}
