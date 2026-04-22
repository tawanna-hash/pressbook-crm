import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { CheckCircle2, FileText, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { portalFormAssignments, portalForms } from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ submitted?: string }>;

export default async function PortalCollectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await getPortalContext();
  if (ctx.role !== "client") {
    return (
      <div className="mx-auto max-w-xl py-12 text-center text-[13px] text-text-2">
        Only clients see assigned forms here. Use Back Office → Client Portals
        to view as a specific client.
      </div>
    );
  }

  const { submitted } = await searchParams;

  const rows = await db
    .select({
      id: portalFormAssignments.id,
      status: portalFormAssignments.status,
      assignedAt: portalFormAssignments.assignedAt,
      submittedAt: portalFormAssignments.submittedAt,
      formId: portalForms.id,
      title: portalForms.title,
      description: portalForms.description,
      fieldCount: portalForms.fields,
    })
    .from(portalFormAssignments)
    .innerJoin(portalForms, eq(portalForms.id, portalFormAssignments.formId))
    .where(
      and(
        eq(portalFormAssignments.contactId, ctx.contact.id),
        eq(portalFormAssignments.orgId, ctx.org.id),
      ),
    )
    .orderBy(desc(portalFormAssignments.assignedAt));

  const pending = rows.filter((r) => r.status !== "submitted");
  const done = rows.filter((r) => r.status === "submitted");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Collect Info</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Forms from our team — fill these out so we can keep your ads and
          account details up to date.
        </p>
      </div>

      {submitted && (
        <div className="rounded-[var(--r)] border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)] px-4 py-2.5 text-[13px] text-pb-green">
          Thanks — your response has been submitted.
        </div>
      )}

      <section>
        <h2 className="mb-2 text-[14px] font-semibold text-text">To Do</h2>
        {pending.length === 0 ? (
          <div className="rounded-[var(--rlg)] border border-dashed border-border bg-card p-8 text-center text-[13px] text-text-2">
            <Inbox className="mx-auto mb-2 h-5 w-5 opacity-50" />
            Nothing to fill out right now.
          </div>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-[var(--rlg)] border border-border bg-card p-4 shadow-[var(--sh-xs)]"
              >
                <FileText className="h-4 w-4 text-pb-amber" />
                <div className="flex-1 min-w-[200px]">
                  <div className="text-[14px] font-semibold text-text">
                    {r.title}
                  </div>
                  {r.description && (
                    <div className="mt-0.5 text-[12.5px] text-text-2">
                      {r.description}
                    </div>
                  )}
                  <div className="mt-1 text-[11.5px] text-text-3">
                    {r.fieldCount?.length ?? 0} fields · Assigned{" "}
                    {r.assignedAt.toLocaleDateString()}
                  </div>
                </div>
                <Link
                  href={`/portal/collect/${r.id}`}
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  Start
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-[14px] font-semibold text-text">Submitted</h2>
          <ul className="space-y-2">
            {done.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-[var(--rlg)] border border-border bg-card p-4"
              >
                <CheckCircle2 className="h-4 w-4 text-pb-green" />
                <div className="flex-1 min-w-[200px]">
                  <div className="text-[14px] font-semibold text-text">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-text-3">
                    Submitted{" "}
                    {r.submittedAt ? r.submittedAt.toLocaleDateString() : ""}
                  </div>
                </div>
                <Link
                  href={`/portal/collect/${r.id}`}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
