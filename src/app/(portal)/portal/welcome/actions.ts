"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Completes first-run onboarding:
 *   - Saves any profile edits the client made (name, phone, company)
 *   - Stamps `portal_onboarded_at` so we don't show the wizard again
 *
 * Safe to call at any time; doing it twice is a no-op for the stamp.
 */
export async function finishOnboarding(formData: FormData): Promise<void> {
  const ctx = await getPortalContext();
  if (ctx.role !== "client") redirect("/portal");

  // Don't run the onboarding-write path when staff is impersonating —
  // we don't want staff to accidentally flip a client's onboarded flag
  // or change their profile without intention.
  if (ctx.impersonation) redirect("/portal");

  const firstName = str(formData, "firstName") ?? ctx.contact.firstName;
  const lastName = str(formData, "lastName");
  const phone = str(formData, "phone");
  const company = str(formData, "company");

  await db
    .update(contacts)
    .set({
      firstName,
      lastName: lastName ?? ctx.contact.lastName,
      phone: phone ?? ctx.contact.phone,
      company: company ?? ctx.contact.company,
      portalOnboardedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(contacts.id, ctx.contact.id), eq(contacts.orgId, ctx.org.id)),
    );

  revalidatePath("/portal", "layout");
  redirect("/portal");
}
