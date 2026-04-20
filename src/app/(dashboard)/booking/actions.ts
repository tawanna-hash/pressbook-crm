"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  availabilitySlots,
  bookingOrgSettings,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

export async function saveOrgBookingUrl(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) return;
  const url = String(formData.get("publicBookingUrl") ?? "").trim() || null;

  // Upsert org booking settings
  const existing = await db
    .select()
    .from(bookingOrgSettings)
    .where(eq(bookingOrgSettings.orgId, org.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(bookingOrgSettings)
      .set({ publicBookingUrl: url, updatedAt: new Date() })
      .where(eq(bookingOrgSettings.orgId, org.id));
  } else {
    await db
      .insert(bookingOrgSettings)
      .values({ orgId: org.id, publicBookingUrl: url });
  }

  revalidatePath("/booking");
}

export async function addAvailabilitySlot(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) return;

  const userId = String(formData.get("userId") ?? "").trim() || null;
  const dayOfWeekRaw = String(formData.get("dayOfWeek") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();

  const dayOfWeek = Number.parseInt(dayOfWeekRaw, 10);
  if (!Number.isFinite(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return;
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return;

  await db.insert(availabilitySlots).values({
    orgId: org.id,
    userId,
    dayOfWeek,
    startTime,
    endTime,
  });
  revalidatePath("/booking");
}

export async function deleteAvailabilitySlot(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const org = await getActiveOrg();
  if (!id || !org) return;
  await db
    .delete(availabilitySlots)
    .where(and(eq(availabilitySlots.id, id), eq(availabilitySlots.orgId, org.id)));
  revalidatePath("/booking");
}
