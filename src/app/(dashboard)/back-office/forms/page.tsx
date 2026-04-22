import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { portalFormAssignments, portalForms } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { Button, buttonClasses } from "@/components/ui/button";
import { createForm } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; new?: string }>;

const EXAMPLE_FIELDS = `[
  {
    "key": "business_name",
    "label": "Business Name",
    "type": "text",
    "required": true
  },
  {
    "key": "contact_phone",
    "label": "Best Phone Number",
    "type": "phone",
    "required": true
  },
  {
    "key": "ad_goals",
    "label": "What are your goals for this ad?",
    "type": "textarea",
    "required": false
  }
]`;

export default async function FormsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const org = await getActiveOrg();
  const { error, new: showNew } = await searchParams;

  if (!org) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Switch to a company in the sidebar to manage its forms.
        </p>
      </div>
    );
  }

  const forms = await db
    .select({
      id: portalForms.id,
      title: portalForms.title,
      description: portalForms.description,
      fields: portalForms.fields,
      updatedAt: portalForms.updatedAt,
      assignmentCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${portalFormAssignments}
        WHERE ${portalFormAssignments.formId} = ${portalForms.id}
      )`,
      submittedCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${portalFormAssignments}
        WHERE ${portalFormAssignments.formId} = ${portalForms.id}
        AND ${portalFormAssignments.status} = 'submitted'
      )`,
    })
    .from(portalForms)
    .where(eq(portalForms.orgId, org.id))
    .orderBy(desc(portalForms.updatedAt));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">Back Office — Forms</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Build forms for <span className="font-semibold">{org.name}</span>{" "}
            clients to fill from their portal (intake, ad submission details,
            onboarding questions, etc.).
          </p>
        </div>
        {!showNew && (
          <Link
            href="/back-office/forms?new=1"
            className={buttonClasses({ variant: "primary", size: "md" })}
          >
            <Plus className="h-4 w-4" />
            New Form
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-[var(--r)] border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-4 py-2.5 text-[13px] text-[color:#7f1d1d]">
          {decodeURIComponent(error)}
        </div>
      )}

      {showNew && (
        <div className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
          <h2 className="mb-3 text-[15px] font-semibold text-text">Create a Form</h2>
          <form action={createForm} className="space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">
                Title
              </label>
              <input
                name="title"
                required
                placeholder="Advertiser Intake"
                className="mt-1 w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">
                Description (optional)
              </label>
              <input
                name="description"
                placeholder="Tell us about your business so we can build your ad."
                className="mt-1 w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">
                Fields (JSON)
              </label>
              <p className="mt-0.5 text-[11.5px] text-text-3">
                Each field needs <code>key</code>, <code>label</code>, and{" "}
                <code>type</code> (text, textarea, email, phone, date, select).
                Add <code>required: true</code> to require it. For{" "}
                <code>select</code>, include an <code>options</code> array.
              </p>
              <textarea
                name="fields"
                rows={12}
                defaultValue={EXAMPLE_FIELDS}
                className="mt-1 w-full rounded-[var(--r)] border border-border bg-muted-bg px-3 py-2 font-mono text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Link
                href="/back-office/forms"
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                Cancel
              </Link>
              <Button type="submit" variant="primary" size="sm">
                Create Form
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted-bg text-left text-[11px] font-semibold uppercase tracking-wide text-text-2">
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Fields</th>
              <th className="px-4 py-2.5">Assigned</th>
              <th className="px-4 py-2.5">Submitted</th>
              <th className="px-4 py-2.5">Updated</th>
              <th className="px-4 py-2.5 text-right">Manage</th>
            </tr>
          </thead>
          <tbody>
            {forms.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-2">
                  <FileText className="mx-auto mb-2 h-5 w-5 opacity-50" />
                  No forms yet. Click <span className="font-semibold">New Form</span> to create one.
                </td>
              </tr>
            )}
            {forms.map((f) => (
              <tr key={f.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{f.title}</div>
                  {f.description && (
                    <div className="mt-0.5 text-[12px] text-text-2">{f.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-text-2">{f.fields?.length ?? 0}</td>
                <td className="px-4 py-3 text-text-2">{f.assignmentCount}</td>
                <td className="px-4 py-3 text-text-2">{f.submittedCount}</td>
                <td className="px-4 py-3 text-text-2">
                  {f.updatedAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/back-office/forms/${f.id}`}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
