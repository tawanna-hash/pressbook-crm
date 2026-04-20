import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { ActiveOrg } from "@/lib/auth/active-org";

/**
 * Ensure the currently signed-in Clerk staff user has a matching row in
 * the `users` table for the given active org. Creates the row on first
 * visit, updates name/email/avatar thereafter.
 *
 * Safe to call on every dashboard request — the lookup is a cheap indexed
 * query on clerk_id, and the insert uses ON-CONFLICT semantics via a
 * pre-check.
 */
export async function syncStaffUser(activeOrg: ActiveOrg): Promise<void> {
  const clerkUser = await currentUser();
  if (!clerkUser) return;

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;
  if (!primaryEmail) return;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    primaryEmail.split("@")[0];

  // Is there already a users row for this Clerk id?
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);

  if (!existing) {
    try {
      await db.insert(users).values({
        clerkId: clerkUser.id,
        orgId: activeOrg.id,
        role: "member",
        name,
        email: primaryEmail,
        avatarUrl: clerkUser.imageUrl || null,
        meetingDurationMinutes: 30,
      });
    } catch {
      // Race condition on first login — another request may have inserted
      // it just before us. Safe to ignore.
    }
  } else {
    // Refresh display info if it's out of date.
    const stale =
      existing.name !== name ||
      existing.email !== primaryEmail ||
      existing.avatarUrl !== (clerkUser.imageUrl || null);
    if (stale) {
      await db
        .update(users)
        .set({
          name,
          email: primaryEmail,
          avatarUrl: clerkUser.imageUrl || null,
        })
        .where(eq(users.clerkId, clerkUser.id));
    }
  }
}
