import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { FileText, Filter } from "lucide-react";
import { db } from "@/lib/db";
import { agreements, contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { AgreementRow } from "./agreement-row";
import { ThreeFlowButtons } from "./flow-modals";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function AgreementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status } = await searchParams;
  const org = await getActiveOrg();

  if (!org) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Pick a company in the sidebar.
        </p>
      </div>
    );
  }

  const filter = STATUS_FILTERS.find((f) => f.key === status) ?? STATUS_FILTERS[0];
  const scope =
    filter.key === "all"
      ? eq(agreements.orgId, org.id)
      : and(
          eq(agreements.orgId, org.id),
          eq(
            agreements.status,
            filter.key as "draft" | "sent" | "active" | "expired" | "cancelled",
          ),
        );

  const rows = await db
    .select({
      id: agreements.id,
      contactId: agreements.contactId,
      type: agreements.type,
      status: agreements.status,
      startDate: agreements.startDate,
      endDate: agreements.endDate,
      amount: agreements.amount,
      notes: agreements.notes,
      createdAt: agreements.createdAt,
      clientFirstName: contacts.firstName,
      clientLastName: contacts.lastName,
      clientCompany: contacts.company,
    })
    .from(agreements)
    .leftJoin(contacts, eq(contacts.id, agreements.contactId))
    .where(scope)
    .orderBy(desc(agreements.createdAt));

  const clientList = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      company: contacts.company,
    })
    .from(contacts)
    .where(and(eq(contacts.orgId, org.id), eq(contacts.type, "client")))
    .orderBy(asc(contacts.firstName))
    .limit(500);

  const clientOptions = clientList.map((c) => ({
    id: c.id,
    name:
      [c.firstName, c.lastName].filter(Boolean).join(" ") +
      (c.company ? ` — ${c.company}` : ""),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Agreements</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Contracts, retainers, and sponsorship deals with your clients.
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-2">
          <Filter className="h-3 w-3" />
          Status
        </span>
        {STATUS_FILTERS.map((f) => {
          const active = filter.key === f.key;
          const href = f.key === "all" ? "/agreements" : `/agreements?status=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                active
                  ? "bg-pb-navy text-white"
                  : "bg-muted-bg text-text-2 hover:bg-muted-bg-2 hover:text-text"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Three-flow action tiles */}
      <ThreeFlowButtons
        clients={clientOptions.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
      />

      {/* Body */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-16 text-center shadow-[var(--sh-xs)]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--rlg)] bg-pb-navy/10 text-pb-navy">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="mb-1 text-[15px] font-semibold text-text">
            {filter.key === "all"
              ? "No Agreements Yet"
              : `No ${filter.label} Agreements`}
          </h2>
          <p className="max-w-sm text-[12.5px] text-text-2">
            Use one of the three flows above to create your first agreement.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const clientName =
                [r.clientFirstName, r.clientLastName]
                  .filter(Boolean)
                  .join(" ") ||
                r.clientCompany ||
                "—";
              return (
                <AgreementRow
                  key={r.id}
                  row={{
                    id: r.id,
                    contactId: r.contactId,
                    clientName,
                    clientCompany: r.clientCompany ?? null,
                    type: r.type ?? null,
                    status: r.status,
                    startDate: r.startDate ? r.startDate.toISOString() : null,
                    endDate: r.endDate ? r.endDate.toISOString() : null,
                    amount: r.amount ?? null,
                    notes: r.notes ?? null,
                  }}
                  clients={clientOptions}
                />
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
