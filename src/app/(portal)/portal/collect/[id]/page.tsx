import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import {
  portalFormAssignments,
  portalForms,
  type PortalFormField,
} from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";
import { Button } from "@/components/ui/button";
import { submitAssignment } from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function PortalCollectFormPage({
  params,
}: {
  params: Params;
}) {
  const ctx = await getPortalContext();
  if (ctx.role !== "client") notFound();

  const { id } = await params;

  const [row] = await db
    .select({
      assignment: portalFormAssignments,
      form: portalForms,
    })
    .from(portalFormAssignments)
    .innerJoin(portalForms, eq(portalForms.id, portalFormAssignments.formId))
    .where(
      and(
        eq(portalFormAssignments.id, id),
        eq(portalFormAssignments.contactId, ctx.contact.id),
        eq(portalFormAssignments.orgId, ctx.org.id),
      ),
    )
    .limit(1);

  if (!row) notFound();

  const { assignment, form } = row;
  const isSubmitted = assignment.status === "submitted";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/portal/collect"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-text-2 hover:text-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Forms
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-text">{form.title}</h1>
        {form.description && (
          <p className="mt-0.5 text-[13px] text-text-2">{form.description}</p>
        )}
        {isSubmitted && (
          <div className="mt-3 inline-flex items-center rounded-full bg-[rgba(16,185,129,0.12)] px-2.5 py-0.5 text-[11.5px] font-semibold text-pb-green">
            Submitted{" "}
            {assignment.submittedAt
              ? assignment.submittedAt.toLocaleDateString()
              : ""}
          </div>
        )}
      </div>

      <form action={submitAssignment} className="space-y-4 rounded-[var(--rlg)] border border-border bg-card p-6 shadow-[var(--sh-xs)]">
        <input type="hidden" name="assignmentId" value={assignment.id} />

        {form.fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            defaultValue={assignment.responses?.[field.key] ?? ""}
            disabled={isSubmitted}
          />
        ))}

        {!isSubmitted && (
          <div className="flex items-center justify-end pt-2">
            <Button type="submit" variant="primary" size="md">
              Submit
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

function FieldInput({
  field,
  defaultValue,
  disabled,
}: {
  field: PortalFormField;
  defaultValue: string;
  disabled: boolean;
}) {
  const name = `field_${field.key}`;
  const common =
    "mt-1 w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy disabled:bg-muted-bg disabled:cursor-not-allowed";

  let input: React.ReactNode;
  if (field.type === "textarea") {
    input = (
      <textarea
        name={name}
        required={field.required}
        defaultValue={defaultValue}
        disabled={disabled}
        rows={4}
        placeholder={field.placeholder}
        className={common}
      />
    );
  } else if (field.type === "select") {
    input = (
      <select
        name={name}
        required={field.required}
        defaultValue={defaultValue}
        disabled={disabled}
        className={common}
      >
        <option value="" disabled>
          {field.placeholder ?? "Select…"}
        </option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  } else {
    const htmlType =
      field.type === "email"
        ? "email"
        : field.type === "phone"
        ? "tel"
        : field.type === "date"
        ? "date"
        : "text";
    input = (
      <input
        type={htmlType}
        name={name}
        required={field.required}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder={field.placeholder}
        className={common}
      />
    );
  }

  return (
    <div>
      <label className="block text-[12.5px] font-semibold text-text">
        {field.label}
        {field.required && <span className="ml-1 text-pb-red">*</span>}
      </label>
      {input}
    </div>
  );
}
