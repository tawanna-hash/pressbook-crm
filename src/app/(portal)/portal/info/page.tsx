import { asc, eq } from "drizzle-orm";
import { Building2, ExternalLink, Globe, MapPin, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { organizationLocations } from "@/lib/db/schema";
import { formatAgencyAddress, getPortalContext } from "@/lib/auth/portal-context";

export const dynamic = "force-dynamic";

type LocationCard = {
  id?: string;
  label: string;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
};

function addressLines(loc: LocationCard): string[] {
  const line1 = [loc.address, loc.address2].filter(Boolean).join(", ");
  const line2 = [loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean);
}

export default async function PortalInfoPage() {
  const ctx = await getPortalContext();
  if (ctx.role !== "client" && ctx.role !== "staff") return null;
  const org = ctx.org;

  // Build the combined location list: primary first (if any details exist),
  // followed by every additional location on organization_locations.
  const primary: LocationCard = {
    label: "Headquarters",
    address: org.address,
    address2: org.address2,
    city: org.city,
    state: org.state,
    zip: org.zip,
    phone: org.phone,
  };
  const primaryHasAnyField =
    primary.address || primary.city || primary.state || primary.zip || primary.phone;

  const extraRows = await db
    .select()
    .from(organizationLocations)
    .where(eq(organizationLocations.orgId, org.id))
    .orderBy(asc(organizationLocations.sortOrder), asc(organizationLocations.createdAt));

  const extras: LocationCard[] = extraRows.map((l) => ({
    id: l.id,
    label: l.label,
    address: l.address,
    address2: l.address2,
    city: l.city,
    state: l.state,
    zip: l.zip,
    phone: l.phone,
  }));

  const locations: LocationCard[] = [
    ...(primaryHasAnyField ? [primary] : []),
    ...extras,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Location</h1>
        <p className="mt-1 text-sm text-muted">Where to find us.</p>
      </div>

      {/* Agency-level quick facts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard
          icon={<Building2 className="h-5 w-5" />}
          label="Agency"
          value={org.name}
        />
        <InfoCard
          icon={<Phone className="h-5 w-5" />}
          label="Main Phone"
          value={org.phone ?? "—"}
          href={org.phone ? `tel:${org.phone}` : undefined}
        />
        <InfoCard
          icon={<Globe className="h-5 w-5" />}
          label="Website"
          value={org.websiteUrl ?? "—"}
          href={org.websiteUrl ?? undefined}
          external={Boolean(org.websiteUrl)}
        />
      </div>

      {/* Locations */}
      {locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
          <MapPin className="mx-auto mb-2 h-6 w-6 text-muted" />
          <p className="text-sm text-muted">No office locations listed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {locations.map((loc, i) => {
            const lines = addressLines(loc);
            return (
              <div
                key={loc.id ?? `primary-${i}`}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pb-navy/10 text-pb-navy">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-foreground">
                    {loc.label}
                  </h3>
                </div>
                <div className="space-y-1 text-sm">
                  {lines.length ? (
                    lines.map((l, idx) => (
                      <div key={idx} className="text-foreground">
                        {l}
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">—</div>
                  )}
                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone}`}
                      className="inline-flex items-center gap-1 pt-1 text-xs text-pb-navy hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {loc.phone}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {org.about && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-foreground">About</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {org.about}
          </p>
        </div>
      )}
    </div>
  );
}

// Keep this helper export so other modules importing it from the old file
// continue to work.
export { formatAgencyAddress };

function InfoCard({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const Body = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pb-navy/10 text-pb-navy">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </div>
        <div className="mt-1 text-sm text-foreground">{value}</div>
      </div>
      {href && external && <ExternalLink className="h-3.5 w-3.5 text-muted" />}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        {Body}
      </a>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      {Body}
    </div>
  );
}
