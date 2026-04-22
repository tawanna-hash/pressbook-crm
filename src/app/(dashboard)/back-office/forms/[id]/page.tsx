import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import {
  contacts,
  portalFormAssignments,
  portalForms,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  assignForm,
  deleteForm,
  unassignForm,
  updateForm,
} from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; saved?: string; assigned?: string }>;

export default async function FormDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const org = await getActiveOrg();
  if (!org) notFound();

  const { id } = await params;
  const { error, saved, assigned } = await searchParams;

  const [form] = await db
    .select()
    .from(portalForms)
    .where(and(eq(portalForms.id, id), eq(portalForms.orgId, org.id)))
    .limit(1);

  if (!form) notFound();

  const [assignments, allContacts] = await Promise.all([
    db
      .select({
        id: portalFormAssignments.id,
        contactId: portalFormAssignments.contactId,
        status: portalFormAssignments.status,
        responses: portalFormAssignments.responses,
        assignedAt: portalFormAssignments.assignedAt,
        submittedAt: portalFormAssignments.submittedAt,
      })
      .from(portalFormAssignments)
      .where(
        and(
          eq(portalFormAssignments.formId, id),
          eq(portalFormAssignments.orgId, org.id),
        ),
      )
      .orderBy(desc(portalFormAssignments.assignedAt)),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
      })
      .from(contacts)
      .where(and(eq(contacts.orgId, org.id), eq(contacts.type, "client")))
      .orderBy(asc(contacts.firstName), asc(contacts.lastName)),
  ]);

  const contactById = new Map(allContacts.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link
          href="/back-office/forms"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-text-2 hover:text-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Forms
        </Link>
        <h1 className="mt-1 text-xl font-bold text-text">{form.title}</h1>
        {form.description && (
          <p className="mt-0.5 text-[13px] text-text-2">{form.description}</p>
        )}
      </div>

      {error && (
        <div className="rounded-[var(--r)] border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.08)] px-4 py-2.5 text-[13px] text-[color:#7f1d1d]">
          {decodeURIComponent(error)}
        </div>
      )}
      {saved && (
        <div className="rounded-[var(--r)] border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)] px-4 py-2.5 text-[13px] text-pb-green">
          Saved.
        </div>
      )}
      {assigned && (
        <div className="rounded-[var(--r)] border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)] px-4 py-2.5 text-[13px] text-pb-green">
          Assigned.
        </div>
      )}

      <section className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
        <h2 className="mb-3 text-[15px] font-semibold text-text">Edit Form</h2>
        <form action={updateForm} className="space-y-3">
          <input type="hidden" name="id" value={form.id} />
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Title</label>
            <input
              name="title"
              required
              defaultValue={form.title}
              className="mt-1 w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Description</label>
            <input
              name="description"
              defaultValue={form.description ?? ""}
              className="mt-1 w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-2">Fields (JSON)</label>
            <textarea
              name="fields"
              rows={14}
              defaultValue={JSON.stringify(form.fields ?? [], null, 2)}
              className="mt-1 w-full rounded-[var(--r)] border border-border bg-muted-bg px-3 py-2 font-mono text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
            />
          </div>
          <div className="flex items-center justify-end">
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
        <div className="mt-3 border-t border-border pt-3">
          <form action={deleteForm}>
            <input type="hidden" name="id" value={form.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete Form
            </Button>
          </form>
        </div>
      </section>

      <section className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
        <h2 className="mb-3 text-[15px] font-semibold text-text">Assign to a Client</h2>
        <form action={assignForm} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="formId" value={form.id} />
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[12px] font-semibold text-text-2">Client</label>
            <select
              name="contactId"
              required
              defaultValue=""
              className="mt-1 w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
            >
              <option value="" disabled>
                Select a client…
              </option>
              {allContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Unnamed"}
                  {c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="primary" size="md">
            Assign
          </Button>
        </form>
      </section>

      <section className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
        <h2 className="mb-3 text-[15px] font-semibold text-text">Assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-[13px] text-text-2">
            No one has this form yet. Assign it above.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[var(--r)] border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted-bg text-left text-[11px] font-semibold uppercase tracking-wide text-text-2">
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Assigned</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const c = contactById.get(a.contactId);
                  const cname = c
                    ? [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                      c.email ||
                      "Unnamed"
                    : "(contact removed)";
                  return (
                    <tr key={a.id} className="border-b border-border last:border-b-0 align-top">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text">{cname}</div>
                        {c?.company && (
                          <div className="text-[12px] text-text-2">{c.company}</div>
                        )}
                        {a.status === "submitted" && a.responses && (
                          <div className="mt-2 space-y-1 text-[12px]">
                            {form.fields.map((f) => (
                              <div key={f.key} className="flex gap-2">
                                <span className="font-semibold text-text-2">
                                  {f.label}:
                                </span>
                                <span className="text-text">
                                  {a.responses?.[f.key] ?? "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            a.status === "submitted"
                              ? "bg-[rgba(16,185,129,0.12)] text-pb-green"
                              : "bg-[rgba(245,158,11,0.12)] text-pb-amber"
                          }`}
                        >
                          {a.status === "submitted" ? "Submitted" : "Assigned"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-2">
                        {a.assignedAt.toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-text-2">
                        {a.submittedAt ? a.submittedAt.toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <form action={unassignForm} className="inline">
                          <input type="hidden" name="assignmentId" value={a.id} />
                          <input type="hidden" name="formId" value={form.id} />
                          <button
                            type="submit"
                            className={buttonClasses({ variant: "ghost", size: "sm" })}
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
