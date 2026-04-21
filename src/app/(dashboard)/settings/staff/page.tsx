import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationLocations, users } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import {
  StaffEditor,
  type LocationOption,
  type StaffRow,
} from "./staff-editor";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const org = await getActiveOrg();
  if (!org) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Switch to a company in the sidebar to manage its staff.
        </p>
      </div>
    );
  }

  const [staffRows, locationRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        locationId: users.locationId,
        address: users.address,
        address2: users.address2,
        city: users.city,
        state: users.state,
        zip: users.zip,
        mobile: users.mobile,
      })
      .from(users)
      .where(eq(users.orgId, org.id))
      .orderBy(asc(users.name)),
    db
      .select({ id: organizationLocations.id, label: organizationLocations.label })
      .from(organizationLocations)
      .where(eq(organizationLocations.orgId, org.id))
      .orderBy(asc(organizationLocations.sortOrder), asc(organizationLocations.createdAt)),
  ]);

  const staff: StaffRow[] = staffRows.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    avatarUrl: s.avatarUrl,
    locationId: s.locationId,
    address: s.address,
    address2: s.address2,
    city: s.city,
    state: s.state,
    zip: s.zip,
    mobile: s.mobile,
  }));

  // Always include "Headquarters" as a virtual option so staff can be
  // assigned to the org's primary address, not just secondary offices.
  const locations: LocationOption[] = [
    ...locationRows.map((l) => ({ id: l.id, label: l.label })),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">Staff</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Manage <span className="font-semibold">{org.name}</span>&apos;s team.
          Edit full name, office location, address, and mobile. Shown on the
          client portal Staff page.
        </p>
      </div>

      <StaffEditor staff={staff} locations={locations} />
    </div>
  );
}
