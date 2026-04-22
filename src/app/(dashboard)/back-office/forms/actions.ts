"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  portalFormAssignments,
  portalForms,
  type PortalFormField,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate a parsed JSON payload claiming to be a list of form fields.
 * Throws with a helpful message instead of silently accepting garbage.
 */
function coerceFields(raw: unknown): PortalFormField[] {
  if (!Array.isArray(raw)) {
    throw new Error("Fields must be a JSON array.");
  }
  const validTypes: PortalFormField["type"][] = [
    "text",
    "textarea",
    "email",
    "phone",
    "date",
    "select",
  ];
  return raw.map((entry, i) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Field #${i + 1} must be an object.`);
    }
    const obj = entry as Record<string, unknown>;
    const key = typeof obj.key === "string" ? obj.key.trim() : "";
    const label = typeof obj.label === "string" ? obj.label.trim() : "";
    const type = obj.type as PortalFormField["type"];
    if (!key) throw new Error(`Field #${i + 1} is missing "key".`);
    if (!label) throw new Error(`Field #${i + 1} is missing "label".`);
    if (!validTypes.includes(type)) {
      throw new Error(
        `Field #${i + 1} has invalid "type" — must be one of ${validTypes.join(", ")}.`,
      );
    }
    const required = obj.required === true;
    const placeholder =
      typeof obj.placeholder === "string" ? obj.placeholder : undefined;
    const options =
      Array.isArray(obj.options) &&
      obj.options.every((o) => typeof o === "string")
        ? (obj.options as string[])
        : undefined;
    if (type === "select" && (!options || options.length === 0)) {
      throw new Error(`Field #${i + 1} is type "select" but has no options.`);
    }
    return { key, label, type, required, placeholder, options };
  });
}

export async function createForm(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) redirect("/back-office/forms");

  const title = str(formData, "title");
  if (!title) redirect("/back-office/forms?error=title");

  const description = str(formData, "description");
  const rawFields = str(formData, "fields") ?? "[]";

  let fields: PortalFormField[];
  try {
    fields = coerceFields(JSON.parse(rawFields));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid fields JSON.";
    redirect(`/back-office/forms?error=${encodeURIComponent(msg)}`);
  }

  const [row] = await db
    .insert(portalForms)
    .values({
      orgId: org.id,
      title,
      description,
      fields,
    })
    .returning({ id: portalForms.id });

  revalidatePath("/back-office/forms");
  redirect(`/back-office/forms/${row.id}`);
}

export async function updateForm(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) redirect("/back-office/forms");

  const id = str(formData, "id");
  if (!id) redirect("/back-office/forms");

  const title = str(formData, "title");
  if (!title) redirect(`/back-office/forms/${id}?error=title`);

  const description = str(formData, "description");
  const rawFields = str(formData, "fields") ?? "[]";

  let fields: PortalFormField[];
  try {
    fields = coerceFields(JSON.parse(rawFields));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid fields JSON.";
    redirect(`/back-office/forms/${id}?error=${encodeURIComponent(msg)}`);
  }

  await db
    .update(portalForms)
    .set({ title, description, fields, updatedAt: new Date() })
    .where(and(eq(portalForms.id, id), eq(portalForms.orgId, org.id)));

  revalidatePath("/back-office/forms");
  revalidatePath(`/back-office/forms/${id}`);
  redirect(`/back-office/forms/${id}?saved=1`);
}

export async function deleteForm(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) redirect("/back-office/forms");

  const id = str(formData, "id");
  if (!id) redirect("/back-office/forms");

  // Cascade: remove assignments first (no FK CASCADE set up).
  await db
    .delete(portalFormAssignments)
    .where(
      and(
        eq(portalFormAssignments.formId, id),
        eq(portalFormAssignments.orgId, org.id),
      ),
    );
  await db
    .delete(portalForms)
    .where(and(eq(portalForms.id, id), eq(portalForms.orgId, org.id)));

  revalidatePath("/back-office/forms");
  redirect("/back-office/forms");
}

export async function assignForm(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) redirect("/back-office/forms");

  const formId = str(formData, "formId");
  const contactId = str(formData, "contactId");
  if (!formId || !contactId) {
    redirect(`/back-office/forms/${formId ?? ""}`);
  }

  // Verify form belongs to active org before inserting.
  const [form] = await db
    .select({ id: portalForms.id })
    .from(portalForms)
    .where(and(eq(portalForms.id, formId), eq(portalForms.orgId, org.id)))
    .limit(1);
  if (!form) redirect("/back-office/forms");

  await db.insert(portalFormAssignments).values({
    orgId: org.id,
    formId,
    contactId,
    status: "assigned",
  });

  revalidatePath(`/back-office/forms/${formId}`);
  revalidatePath("/portal/collect");
  redirect(`/back-office/forms/${formId}?assigned=1`);
}

export async function unassignForm(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) redirect("/back-office/forms");

  const assignmentId = str(formData, "assignmentId");
  const formId = str(formData, "formId");
  if (!assignmentId || !formId) {
    redirect(`/back-office/forms/${formId ?? ""}`);
  }

  await db
    .delete(portalFormAssignments)
    .where(
      and(
        eq(portalFormAssignments.id, assignmentId),
        eq(portalFormAssignments.orgId, org.id),
      ),
    );

  revalidatePath(`/back-office/forms/${formId}`);
  revalidatePath("/portal/collect");
  redirect(`/back-office/forms/${formId}`);
}
