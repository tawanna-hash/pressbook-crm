"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { organizationLocations, organizations } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

export type CompanyProfileResult = {
  ok: boolean;
  message: string;
};

export type LocationResult = {
  ok: boolean;
  message: string;
};

export async function updateCompanyProfile(
  formData: FormData,
): Promise<CompanyProfileResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, message: "Select a company first." };

  const str = (k: string): string | null => {
    const v = formData.get(k);
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const logoUrl = formData.get("logoUrl");
  const logoValue =
    typeof logoUrl === "string" && logoUrl.length > 0 ? logoUrl : null;

  await db
    .update(organizations)
    .set({
      logoUrl:    logoValue,
      phone:      str("phone"),
      websiteUrl: str("websiteUrl"),
      address:    str("address"),
      address2:   str("address2"),
      city:       str("city"),
      state:      str("state"),
      zip:        str("zip"),
      about:      str("about"),
      updatedAt:  new Date(),
    })
    .where(eq(organizations.id, org.id));

  revalidatePath("/settings/company");
  revalidatePath("/portal");
  revalidatePath("/portal/info");
  return { ok: true, message: "Saved." };
}

// ═══════════════════════════════════════════════════════════════
// Additional Locations
// ═══════════════════════════════════════════════════════════════

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createOrganizationLocation(
  formData: FormData,
): Promise<LocationResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, message: "Select a company first." };

  const label = str(formData, "label") ?? "Office";
  const address = str(formData, "address");
  if (!address) return { ok: false, message: "Address is required." };

  await db.insert(organizationLocations).values({
    orgId: org.id,
    label,
    address,
    address2: str(formData, "address2"),
    city:     str(formData, "city"),
    state:    str(formData, "state"),
    zip:      str(formData, "zip"),
    phone:    str(formData, "phone"),
  });

  revalidatePath("/settings/company");
  revalidatePath("/portal/info");
  return { ok: true, message: "Location added." };
}

export async function updateOrganizationLocation(
  formData: FormData,
): Promise<LocationResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, message: "Select a company first." };

  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Missing id." };

  const address = str(formData, "address");
  if (!address) return { ok: false, message: "Address is required." };

  await db
    .update(organizationLocations)
    .set({
      label:    str(formData, "label") ?? "Office",
      address,
      address2: str(formData, "address2"),
      city:     str(formData, "city"),
      state:    str(formData, "state"),
      zip:      str(formData, "zip"),
      phone:    str(formData, "phone"),
      updatedAt: new Date(),
    })
    .where(and(
      eq(organizationLocations.id, id),
      eq(organizationLocations.orgId, org.id),
    ));

  revalidatePath("/settings/company");
  revalidatePath("/portal/info");
  return { ok: true, message: "Saved." };
}

export async function deleteOrganizationLocation(
  id: string,
): Promise<LocationResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, message: "Select a company first." };

  await db
    .delete(organizationLocations)
    .where(and(
      eq(organizationLocations.id, id),
      eq(organizationLocations.orgId, org.id),
    ));

  revalidatePath("/settings/company");
  revalidatePath("/portal/info");
  return { ok: true, message: "Deleted." };
}
