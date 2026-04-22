import { and, asc, desc, eq } from "drizzle-orm";
import { LogOut, Mail, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { contacts, portalMagicLinks } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { getImpersonatedContactId } from "@/lib/auth/impersonation";
import { Button } from "@/components/ui/button";
import {
  sendMagicLink,
  startImpersonation,
  stopImpersonation,
} from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  portalEmail: string | null;
  company: string | null;
  status: string | null;
  lastLinkSentAt: Date | null;
  lastLinkConsumedAt: Date | null;
};

type SearchParams = Promise<{
  linkForContact?: string;
  url?: string;
  delivery?: string;
  deliveryReason?: string;
}>;

function fullName(r: Row): string {
  return [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";
}

function portalEmailFor(r: Row): string {
  return r.portalEmail || r.email || "—";
}

export default async function BackOfficePortalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const org = await getActiveOrg();
  const { linkForContact, url, delivery, deliveryReason } = await searchParams;

  if (!org) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Switch to a company in the sidebar to access the Back Office.
        </p>
      </div>
    );
  }

  const contactRows = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      portalEmail: contacts.portalEmail,
      company: contacts.company,
      status: contacts.status,
    })
    .from(contacts)
    .where(and(eq(contacts.orgId, org.id), eq(contacts.type, "client")))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName));

  // Most recent magic link per contact — used to show "link sent X ago"
  // and whether the client has clicked through.
  const linkRows = await db
    .select({
      contactId: portalMagicLinks.contactId,
      createdAt: portalMagicLinks.createdAt,
      consumedAt: portalMagicLinks.consumedAt,
    })
    .from(portalMagicLinks)
    .where(eq(portalMagicLinks.orgId, org.id))
    .orderBy(desc(portalMagicLinks.createdAt));

  const lastLinkByContact = new Map<
    string,
    { sent: Date; consumed: Date | null }
  >();
  for (const l of linkRows) {
    if (!lastLinkByContact.has(l.contactId)) {
      lastLinkByContact.set(l.contactId, {
        sent: l.createdAt,
        consumed: l.consumedAt,
      });
    }
  }

  const rows: Row[] = contactRows.map((r) => {
    const last = lastLinkByContact.get(r.id);
    return {
      ...r,
      lastLinkSentAt: last?.sent ?? null,
      lastLinkConsumedAt: last?.consumed ?? null,
    };
  });

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

      {linkForContact && url && (
        <div className="rounded-[var(--r)] border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.06)] px-4 py-3 text-[13px] text-text">
          <div className="mb-1 flex items-center gap-2 font-semibold text-pb-green">
            <Mail className="h-4 w-4" />
            {delivery === "sent"
              ? "Magic link emailed."
              : deliveryReason === "no_api_key"
              ? "Link generated (Resend not configured — copy below)."
              : deliveryReason === "no_recipient"
              ? "Link generated, but this contact has no email on file."
              : "Link generated (email provider didn't accept it — copy below)."}
          </div>
          <div className="break-all rounded-[var(--r)] bg-white px-3 py-2 font-mono text-[12px] text-text-2 border border-border">
            {url}
          </div>
          <div className="mt-1.5 text-[11.5px] text-text-3">
            One-time use · expires in 24h · tied to this client only.
          </div>
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
              <th className="px-4 py-2.5">Last Link</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
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
              const isActive = r.id === activeImpersonationId;
              const hasEmail = Boolean(r.portalEmail || r.email);
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
                  <td className="px-4 py-3 text-[12px] text-text-2">
                    <LinkStatus
                      sentAt={r.lastLinkSentAt}
                      consumedAt={r.lastLinkConsumedAt}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <form action={sendMagicLink} className="inline">
                        <input type="hidden" name="contactId" value={r.id} />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          leftIcon={<Mail className="h-3.5 w-3.5" />}
                          disabled={!hasEmail}
                          title={hasEmail ? "Send magic link" : "No email on file"}
                        >
                          Send Link
                        </Button>
                      </form>
                      <form action={startImpersonation} className="inline">
                        <input type="hidden" name="contactId" value={r.id} />
                        <Button
                          type="submit"
                          variant={isActive ? "secondary" : "primary"}
                          size="sm"
                        >
                          {isActive ? "Re-open" : "Open As"}
                        </Button>
                      </form>
                    </div>
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

function LinkStatus({
  sentAt,
  consumedAt,
}: {
  sentAt: Date | null;
  consumedAt: Date | null;
}) {
  if (!sentAt) return <span className="text-text-3">Never sent</span>;
  const dateStr = sentAt.toLocaleDateString();
  if (consumedAt) {
    return (
      <span>
        <span className="font-semibold text-pb-green">Opened</span>
        <span className="text-text-3"> · sent {dateStr}</span>
      </span>
    );
  }
  return (
    <span>
      <span className="font-semibold text-pb-amber">Sent</span>
      <span className="text-text-3"> · {dateStr}</span>
    </span>
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
