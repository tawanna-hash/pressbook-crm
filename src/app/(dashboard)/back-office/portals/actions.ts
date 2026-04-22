"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contacts, users } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { getPortalRole } from "@/lib/auth/role";
import {
  clearImpersonatedContactCookie,
  setImpersonatedContactCookie,
} from "@/lib/auth/impersonation";
import { createMagicLink } from "@/lib/auth/portal-session";
import { sendMagicLinkEmail } from "@/lib/email/send-magic-link";

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

/**
 * Generate a fresh magic link for a contact and attempt to email it via
 * Resend. Regardless of email success/failure, we redirect back to the
 * Back Office Portals page with the generated URL in the query string
 * so staff can always copy it as a fallback — matches the "both email
 * and show link" delivery choice.
 */
export async function sendMagicLink(formData: FormData): Promise<void> {
  const role = await getPortalRole();
  if (role !== "staff") redirect("/back-office/portals");

  const org = await getActiveOrg();
  if (!org) redirect("/back-office/portals");

  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || !contactId) {
    redirect("/back-office/portals");
  }

  // Verify contact belongs to the staff's active org.
  const [target] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      portalEmail: contacts.portalEmail,
    })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.orgId, org.id)))
    .limit(1);
  if (!target) redirect("/back-office/portals");

  // Look up the sender's users row (if any) for the audit column.
  const { userId: clerkId } = await auth();
  let createdByUserId: string | null = null;
  if (clerkId) {
    const [me] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.clerkId, clerkId), eq(users.orgId, org.id)))
      .limit(1);
    createdByUserId = me?.id ?? null;
  }

  const link = await createMagicLink({
    orgId: org.id,
    contactId: target.id,
    createdByUserId,
  });

  const toEmail = target.portalEmail || target.email || "";
  const emailResult = await sendMagicLinkEmail({
    toEmail,
    toName: [target.firstName, target.lastName].filter(Boolean).join(" ") || null,
    orgName: org.name,
    orgBrandColor: org.brandColor,
    magicUrl: link.url,
    expiresAt: link.expiresAt,
  });

  const qs = new URLSearchParams({
    linkForContact: target.id,
    url: link.url,
    delivery: emailResult.sent ? "sent" : "copy_only",
  });
  if (!emailResult.sent && "reason" in emailResult) {
    qs.set("deliveryReason", emailResult.reason);
  }

  revalidatePath("/back-office/portals");
  redirect(`/back-office/portals?${qs.toString()}`);
}
