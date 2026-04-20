"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

export type AppointmentFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<
    Record<"clientId" | "title" | "date" | "location" | "type", string>
  >;
};

/**
 * Create a new client appointment on the active organization's calendar.
 */
export async function createAppointment(
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const durationRaw = String(formData.get("durationMinutes") ?? "30").trim();
  const location = String(formData.get("location") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: NonNullable<AppointmentFormState["fieldErrors"]> = {};

  if (!clientId) fieldErrors.clientId = "Pick a client.";
  if (!title) fieldErrors.title = "Give the appointment a title.";
  if (!dateRaw) fieldErrors.date = "Pick a date and time.";

  const date = dateRaw ? new Date(dateRaw) : null;
  if (date && isNaN(date.getTime())) {
    fieldErrors.date = "That date couldn't be read.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const org = await getActiveOrg();
  if (!org) {
    return { ok: false, message: "No active company. Pick one in the sidebar." };
  }

  const durationMinutes = Number.parseInt(durationRaw, 10) || null;

  try {
    await db.insert(calendarEvents).values({
      orgId: org.id,
      contactId: clientId,
      title,
      date: date!,
      durationMinutes,
      location: location || null,
      type: type || null,
      notes: notes || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, message: `Couldn't save appointment: ${message}` };
  }

  revalidatePath("/calendarly");
  return { ok: true, message: "Appointment scheduled." };
}

/**
 * Cancel an appointment (delete). Called from a form on the list row.
 */
export async function deleteAppointment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const org = await getActiveOrg();
  if (!org) return;

  // Important: require the event to belong to the active org before deleting.
  const { and, eq } = await import("drizzle-orm");
  await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, org.id)));
  revalidatePath("/calendarly");
}
