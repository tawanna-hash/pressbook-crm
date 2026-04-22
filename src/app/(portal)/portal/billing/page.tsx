import { and, desc, eq } from "drizzle-orm";
import { CheckCircle2, Clock, FileSignature } from "lucide-react";
import { db } from "@/lib/db";
import { agreements } from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";
import { PayButton } from "./pay-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ paid?: string }>;

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "#6B7280" },
  sent:      { label: "Sent",      color: "#0EA5E9" },
  signed:    { label: "Signed",    color: "#10B981" },
  active:    { label: "Active",    color: "#10B981" },
  expired:   { label: "Expired",   color: "#F59E0B" },
  cancelled: { label: "Cancelled", color: "#6B7280" },
};

export default async function PortalBillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await getPortalContext();
  if (ctx.role !== "client" && ctx.role !== "staff") return null;

  const { paid } = await searchParams;

  const whereClause =
    ctx.role === "client"
      ? and(
          eq(agreements.orgId, ctx.org.id),
          eq(agreements.contactId, ctx.contact.id),
        )
      : eq(agreements.orgId, ctx.org.id);

  const rows = await db
    .select()
    .from(agreements)
    .where(whereClause)
    .orderBy(desc(agreements.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Agreements and invoices with {ctx.org.name}.
        </p>
      </div>

      {paid && (
        <div className="flex items-center gap-2 rounded-lg bg-[rgba(16,185,129,0.08)] px-3 py-2 text-sm text-pb-green">
          <CheckCircle2 className="h-4 w-4" />
          Payment received — thank you!
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
          <FileSignature className="mx-auto mb-3 h-7 w-7 text-muted" />
          <p className="text-sm text-muted">No agreements on file yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#FAFBFC] text-[10px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Start</th>
                <th className="px-4 py-3 text-left font-semibold">End</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => {
                const status = STATUS_LABEL[a.status] ?? STATUS_LABEL.draft;
                const amt = a.adRate ?? a.amount;
                const title =
                  [a.companyName, a.adSize, a.frequency].filter(Boolean).join(" · ") ||
                  a.type ||
                  "Agreement";
                // paidAt is set by the Stripe webhook on
                // checkout.session.completed. stripeInvoiceId is retained
                // as a fallback for historical rows where paidAt wasn't
                // backfilled.
                const isPaid = Boolean(a.paidAt) || Boolean(a.stripeInvoiceId);
                const canPay =
                  !isPaid && a.status !== "cancelled" && amt && amt > 0;
                return (
                  <tr key={a.id} className="hover:bg-[#FAFBFC]">
                    <td className="px-4 py-3 font-medium text-foreground">{title}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: status.color + "14",
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatMoney(amt)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(a.startDate)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(a.endDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-pb-green">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Paid
                        </span>
                      ) : canPay ? (
                        <PayButton agreementId={a.id} />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Clock className="h-3.5 w-3.5" />
                          Not billable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
