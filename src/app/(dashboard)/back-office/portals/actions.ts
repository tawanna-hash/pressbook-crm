"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { getPortalRole } from "@/lib/auth/role";
import {
  clearImpersonatedContactCookie,
  setImpersonatedContactCookie,
} from "@/lib/auth/impersonation";

/**
 * Begin impersonating the given contact. The contact must belong to the
 * current staff member's active org — otherwise we reject silently and
 * keep the caller on the back-office page.
 *
 * On success, redirects to /portal, where getPortalContext will now
 * resolve the staff user as role:"client" with an impersonation marker.
 */
export async function startImpersonation(formData: FormData): Promise<void> {
  const role = await getPortalRole();
  if (role !== "staff") {
    redirect("/back-office/portals");
  }

  const org = await getActiveOrg();
  if (!org) redirect("/back-office/portals");

  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || !contactId) {
    redirect("/back-office/portals");
  }

  // Guard: contact must be in the staff's active org.
  const [target] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.orgId, org.id)))
    .limit(1);

  if (!target) {
    redirect("/back-office/portals");
  }

  await setImpersonatedContactCookie(target.id);
  redirect("/portal");
}

/**
 * Exit impersonation and return to the back-office page. Safe to call
 * even if no impersonation is active.
 */
export async function stopImpersonation(): Promise<void> {
  await clearImpersonatedContactCookie();
  revalidatePath("/portal", "layout");
  revalidatePath("/back-office/portals");
  redirect("/back-office/portals");
}
