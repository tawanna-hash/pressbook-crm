import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationLocations } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { CompanyProfileForm } from "./company-form";
import { LocationsEditor, type Location } from "./locations-editor";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const org = await getActiveOrg();
  if (!org) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Switch to a company in the sidebar to edit its profile.
        </p>
      </div>
    );
  }

  const locationRows = await db
    .select()
    .from(organizationLocations)
    .where(eq(organizationLocations.orgId, org.id))
    .orderBy(asc(organizationLocations.sortOrder), asc(organizationLocations.createdAt));

  const locations: Location[] = locationRows.map((l) => ({
    id: l.id,
    label: l.label,
    address: l.address,
    address2: l.address2,
    city: l.city,
    state: l.state,
    zip: l.zip,
    phone: l.phone,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">Company Profile</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          This information appears in the client portal for{" "}
          <span className="font-semibold">{org.name}</span>.
        </p>
      </div>

      <CompanyProfileForm
        org={{
          name:       org.name,
          logoUrl:    org.logoUrl,
          phone:      org.phone,
          websiteUrl: org.websiteUrl,
          address:    org.address,
          address2:   org.address2,
          city:       org.city,
          state:      org.state,
          zip:        org.zip,
          about:      org.about,
        }}
      />

      <LocationsEditor locations={locations} />
    </div>
  );
}
