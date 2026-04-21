import { asc, eq } from "drizzle-orm";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";

export const dynamic = "force-dynamic";

export default async function PortalTeamPage() {
  const ctx = await getPortalContext();
  if (ctx.role !== "client" && ctx.role !== "staff") return null;

  const team = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      bookingBio: users.bookingBio,
      publicBookingUrl: users.publicBookingUrl,
    })
    .from(users)
    .where(eq(users.orgId, ctx.org.id))
    .orderBy(asc(users.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff</h1>
        <p className="mt-1 text-sm text-muted">Your {ctx.org.name} team.</p>
      </div>

      {team.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-muted">No staff members listed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => {
            const initials = m.name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatarUrl}
                      alt={m.name}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-pb-navy"
                      style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
                    >
                      {initials || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {m.name}
                    </div>
                    {m.email && (
                      <a
                        href={`mailto:${m.email}`}
                        className="inline-flex items-center gap-1 truncate text-xs text-pb-navy hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {m.email}
                      </a>
                    )}
                  </div>
                </div>
                {m.bookingBio && (
                  <p className="text-xs leading-relaxed text-muted">
                    {m.bookingBio}
                  </p>
                )}
                {m.publicBookingUrl && (
                  <a
                    href={m.publicBookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex items-center gap-1 self-start text-xs font-medium text-pb-navy hover:underline"
                  >
                    Book time with {m.name.split(" ")[0]} →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
