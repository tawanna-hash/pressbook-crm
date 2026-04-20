import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { AddClientForm } from "./add-client-form";
import { ClientsFilters } from "./clients-filters";
import { ViewToggle } from "./view-toggle";
import { ClientCard } from "./client-card";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  view?: string;
}>;

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: "Active",   color: "#10B981" },
  prospect: { label: "Prospect", color: "#F59E0B" },
  inactive: { label: "Inactive", color: "#6B7280" },
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, status, view } = await searchParams;
  const query = (q ?? "").trim();
  const hasSearch = query.length > 0;
  const isCardView = view === "cards";

  const activeOrg = await getActiveOrg();

  const conditions: SQL[] = [eq(contacts.type, "client")];
  if (activeOrg) {
    conditions.push(eq(contacts.orgId, activeOrg.id));
  }
  if (hasSearch) {
    const pattern = `%${query}%`;
    const textMatch = or(
      ilike(contacts.firstName, pattern),
      ilike(contacts.lastName, pattern),
      ilike(contacts.email, pattern),
      ilike(contacts.company, pattern),
    );
    if (textMatch) conditions.push(textMatch);
  }
  if (status === "active" || status === "prospect" || status === "inactive") {
    conditions.push(eq(contacts.status, status));
  }

  const rows = await db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .orderBy(desc(contacts.createdAt))
    .limit(100);

  const hasFilters = hasSearch || (status && status !== "all");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">
            Clients
          </h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            {activeOrg
              ? "Switch companies in the sidebar to see the other list."
              : "Switch to a company in the sidebar to see its clients."}
          </p>
        </div>
      </div>

      <AddClientForm />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            All Clients
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {rows.length} {rows.length === 1 ? "client" : "clients"}
              {hasFilters && " match"}
            </span>
            <ViewToggle />
          </div>
        </div>

        <ClientsFilters />

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted">
            {hasFilters
              ? "No clients match your filters. Try clearing them."
              : "No clients yet. Add one above to get started."}
          </div>
        ) : isCardView ? (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((c) => (
              <ClientCard
                key={c.id}
                client={{
                  id: c.id,
                  avatarUrl: c.avatarUrl,
                  firstName: c.firstName,
                  lastName: c.lastName,
                  email: c.email,
                  phone: c.phone,
                  company: c.company,
                  title: c.title,
                  city: c.city,
                  state: c.state,
                  status: c.status,
                  clerkId: c.clerkId,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[#FAFBFC] text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Portal</th>
                  <th className="px-6 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const name = [c.firstName, c.lastName]
                    .filter(Boolean)
                    .join(" ");
                  const activated = Boolean(c.clerkId);
                  const statusMeta =
                    STATUS_BADGE[c.status ?? "prospect"] ??
                    STATUS_BADGE.prospect;
                  return (
                    <tr
                      key={c.id}
                      className="group cursor-pointer border-b border-border last:border-0 hover:bg-[#FAFBFC]"
                    >
                      <td className="px-6 py-3 font-medium text-foreground">
                        <Link
                          href={`/clients/${c.id}`}
                          className="flex items-center gap-3"
                        >
                          {c.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.avatarUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-pb-navy"
                              style={{
                                backgroundColor: "rgba(2, 29, 64, 0.08)",
                              }}
                            >
                              {(
                                (c.firstName?.[0] ?? "") +
                                (c.lastName?.[0] ?? "")
                              ).toUpperCase() || "—"}
                            </div>
                          )}
                          <span>{name || "—"}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-muted">
                        {c.company ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-foreground">
                        <Link href={`/clients/${c.id}`} className="block">
                          {c.email ?? "—"}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-muted">{c.phone ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: statusMeta.color + "14",
                            color: statusMeta.color,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {activated ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-pb-green">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                            <Circle className="h-3.5 w-3.5" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/clients/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-pb-navy opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Edit
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
