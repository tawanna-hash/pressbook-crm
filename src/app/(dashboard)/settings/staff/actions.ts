"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

export type StaffResult = {
  ok: boolean;
  message: string;
};

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateStaffMember(
  formData: FormData,
): Promise<StaffResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, message: "Select a company first." };

  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Missing staff id." };

  const name = str(formData, "name");
  if (!name) return { ok: false, message: "Full name is required." };

  const rawLocation = formData.get("locationId");
  const locationId =
    typeof rawLocation === "string" && rawLocation && rawLocation !== "none"
      ? rawLocation
      : null;

  await db
    .update(users)
    .set({
      name,
      locationId,
      address:  str(formData, "address"),
      address2: str(formData, "address2"),
      city:     str(formData, "city"),
      state:    str(formData, "state"),
      zip:      str(formData, "zip"),
      mobile:   str(formData, "mobile"),
    })
    .where(and(
      eq(users.id, id),
      eq(users.orgId, org.id),
    ));

  revalidatePath("/settings/staff");
  revalidatePath("/portal/team");
  return { ok: true, message: "Saved." };
}
