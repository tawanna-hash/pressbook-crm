"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  portalFormAssignments,
  portalForms,
  type PortalFormResponses,
} from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";

/**
 * Client-side submit: write the filled-in responses to the assignment
 * row and mark it submitted. Only honors the write when the assignment
 * actually belongs to the currently-resolved contact (including a
 * staff-impersonated client session).
 */
export async function submitAssignment(formData: FormData): Promise<void> {
  const ctx = await getPortalContext();
  if (ctx.role !== "client") redirect("/portal/collect");

  const assignmentId = formData.get("assignmentId");
  if (typeof assignmentId !== "string" || !assignmentId) {
    redirect("/portal/collect");
  }

  // Look up the assignment + form together, gated to this contact + org.
  const [row] = await db
    .select({
      assignment: portalFormAssignments,
      form: portalForms,
    })
    .from(portalFormAssignments)
    .innerJoin(portalForms, eq(portalForms.id, portalFormAssignments.formId))
    .where(
      and(
        eq(portalFormAssignments.id, assignmentId),
        eq(portalFormAssignments.contactId, ctx.contact.id),
        eq(portalFormAssignments.orgId, ctx.org.id),
      ),
    )
    .limit(1);

  if (!row) redirect("/portal/collect");

  // Build the responses map from the form's declared fields. We only
  // persist keys we know about — no arbitrary payload smuggling.
  const responses: PortalFormResponses = {};
  for (const field of row.form.fields) {
    const raw = formData.get(`field_${field.key}`);
    responses[field.key] = typeof raw === "string" ? raw : null;
  }

  await db
    .update(portalFormAssignments)
    .set({
      responses,
      status: "submitted",
      submittedAt: new Date(),
    })
    .where(eq(portalFormAssignments.id, assignmentId));

  revalidatePath("/portal/collect");
  revalidatePath(`/portal/collect/${assignmentId}`);
  revalidatePath(`/back-office/forms/${row.form.id}`);
  redirect("/portal/collect?submitted=1");
}
