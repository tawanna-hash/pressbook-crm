import { and, asc, eq } from "drizzle-orm";
import { LogOut, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { getImpersonatedContactId } from "@/lib/auth/impersonation";
import { Button } from "@/components/ui/button";
import { startImpersonation, stopImpersonation } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  portalEmail: string | null;
  company: string | null;
  status: string | null;
  clerkId: string | null;
  portalActivatedAt: Date | null;
};

function fullName(r: Row): string {
  return [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";
}

function portalEmailFor(r: Row): string {
  return r.portalEmail || r.email || "—";
}

export default async function BackOfficePortalsPage() {
  const org = await getActiveOrg();
  if (!org) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Switch to a company in the sidebar to access the Back Office.
        </p>
      </div>
    );
  }

  const rows: Row[] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      portalEmail: contacts.portalEmail,
      company: contacts.company,
      status: contacts.status,
      clerkId: contacts.clerkId,
      portalActivatedAt: contacts.portalActivatedAt,
    })
    .from(contacts)
    .where(and(eq(contacts.orgId, org.id), eq(contacts.type, "client")))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName));

  const activeImpersonationId = await getImpersonatedContactId();
  const activeRow =
    activeImpersonationId
      ? rows.find((r) => r.id === activeImpersonationId) ?? null
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">Back Office — Client Portals</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          View the client portal as any client in{" "}
          <span className="font-semibold">{org.name}</span>. You&apos;ll see
          exactly what they see. Actions you take are performed as the
          client — use with care.
        </p>
      </div>

      {activeRow && (
        <div className="flex items-center justify-between rounded-[var(--r)] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-[13px] text-[color:#8a6900]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>
              You are currently impersonating{" "}
              <span className="font-semibold">{fullName(activeRow)}</span>
              {activeRow.company ? ` (${activeRow.company})` : ""}.
            </span>
          </div>
          <form action={stopImpersonation}>
            <Button type="submit" variant="secondary" size="sm" leftIcon={<LogOut className="h-3.5 w-3.5" />}>
              Exit Impersonation
            </Button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted-bg text-left text-[11px] font-semibold uppercase tracking-wide text-text-2">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Company</th>
              <th className="px-4 py-2.5">Portal Email</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Portal</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-2">
                  No clients in {org.name} yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const activated = Boolean(r.clerkId);
              const isActive = r.id === activeImpersonationId;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-border last:border-b-0 ${
                    isActive ? "bg-[rgba(245,158,11,0.06)]" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-text">{fullName(r)}</td>
                  <td className="px-4 py-3 text-text-2">{r.company || "—"}</td>
                  <td className="px-4 py-3 text-text-2">{portalEmailFor(r)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    {activated ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.12)] px-2 py-0.5 text-[11px] font-semibold text-pb-green">
                        Activated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted-bg-2 px-2 py-0.5 text-[11px] font-semibold text-text-2">
                        Not Activated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={startImpersonation} className="inline">
                      <input type="hidden" name="contactId" value={r.id} />
                      <Button
                        type="submit"
                        variant={isActive ? "secondary" : "primary"}
                        size="sm"
                      >
                        {isActive ? "Re-open Portal" : "Open Portal As"}
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  const color =
    status === "active"
      ? "bg-[rgba(16,185,129,0.12)] text-pb-green"
      : status === "prospect"
      ? "bg-[rgba(245,158,11,0.12)] text-pb-amber"
      : status === "inactive"
      ? "bg-muted-bg-2 text-text-2"
      : "bg-muted-bg-2 text-text-2";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      {label}
    </span>
  );
}
