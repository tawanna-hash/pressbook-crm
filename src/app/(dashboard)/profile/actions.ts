"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

export type ProfileFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const INITIAL_OK: ProfileFormState = { ok: true, message: "Saved." };

/**
 * Look up the signed-in user's row in the current active org. All profile
 * actions must resolve through this — we never trust an ID from the client.
 */
async function resolveSelf() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  const org = await getActiveOrg();
  if (!org) return null;

  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.clerkId, clerkUser.id), eq(users.orgId, org.id)))
    .limit(1);
  return row ?? null;
}

/**
 * Update the user's own display name and/or avatar URL.
 * Avatar is expected as a base64 data URL (same pattern used on contacts).
 * Empty avatarUrl clears the custom photo (falls back to initials in the UI).
 */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const self = await resolveSelf();
  if (!self) return { ok: false, message: "Not signed in, or not a member of this org." };

  const name = String(formData.get("name") ?? "").trim();
  const avatarUrlRaw = String(formData.get("avatarUrl") ?? "").trim();
  const avatarUrl = avatarUrlRaw === "" ? null : avatarUrlRaw;

  const fieldErrors: ProfileFormState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Name is required.";
  if (avatarUrl && !/^data:image\/|^https?:\/\//.test(avatarUrl)) {
    fieldErrors.avatarUrl = "Avatar must be a data URL or https:// URL.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Fix the highlighted fields.", fieldErrors };
  }

  await db
    .update(users)
    .set({ name, avatarUrl })
    .where(eq(users.id, self.id));

  revalidatePath("/profile");
  revalidatePath("/"); // sidebar / dashboard greeting refresh
  return { ...INITIAL_OK, message: "Profile updated." };
}

/**
 * Update booking-related preferences on the user's own row.
 */
export async function updateBookingPrefs(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const self = await resolveSelf();
  if (!self) return { ok: false, message: "Not signed in, or not a member of this org." };

  const publicBookingUrlRaw = String(formData.get("publicBookingUrl") ?? "").trim();
  const publicBookingUrl = publicBookingUrlRaw === "" ? null : publicBookingUrlRaw;
  const durationRaw = Number(formData.get("meetingDurationMinutes") ?? 30);
  const meetingDurationMinutes =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.floor(durationRaw) : 30;
  const meetingLocationRaw = String(formData.get("meetingLocation") ?? "").trim();
  const meetingLocation = meetingLocationRaw === "" ? null : meetingLocationRaw;
  const bookingBioRaw = String(formData.get("bookingBio") ?? "").trim();
  const bookingBio = bookingBioRaw === "" ? null : bookingBioRaw;

  const fieldErrors: ProfileFormState["fieldErrors"] = {};
  if (publicBookingUrl && !/^https?:\/\//.test(publicBookingUrl)) {
    fieldErrors.publicBookingUrl = "Must be an http(s) URL.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Fix the highlighted fields.", fieldErrors };
  }

  await db
    .update(users)
    .set({
      publicBookingUrl,
      meetingDurationMinutes,
      meetingLocation,
      bookingBio,
    })
    .where(eq(users.id, self.id));

  revalidatePath("/profile");
  revalidatePath("/booking");
  return { ...INITIAL_OK, message: "Booking preferences updated." };
}
