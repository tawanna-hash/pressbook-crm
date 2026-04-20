"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { calendarEvents, organizations } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

export type TeamEventFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<
    Record<"title" | "startDate" | "startTime" | "agentEmail", string>
  >;
};

function combineDateTime(date: string, time: string): Date | null {
  if (!date) return null;
  const when = time ? `${date}T${time}` : `${date}T00:00`;
  const parsed = new Date(when);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function emailLooksValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function createTeamEvent(
  _prev: TeamEventFormState,
  formData: FormData,
): Promise<TeamEventFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const agentEmail = String(formData.get("agentEmail") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  // Optional org override (which company this event belongs to)
  const orgSlug = String(formData.get("orgSlug") ?? "").trim();

  const fieldErrors: NonNullable<TeamEventFormState["fieldErrors"]> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (!startDate) fieldErrors.startDate = "Pick a start date.";
  if (!startTime) fieldErrors.startTime = "Pick a start time.";
  if (agentEmail && !emailLooksValid(agentEmail)) {
    fieldErrors.agentEmail = "Not a valid email.";
  }

  const startAt = combineDateTime(startDate, startTime);
  const endAt = endDate ? combineDateTime(endDate, endTime) : null;

  if (!startAt) fieldErrors.startDate = "Invalid start date/time.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  // Decide which org the event lives in:
  //  - explicit orgSlug from the form if valid,
  //  - else fall back to the currently-active org.
  let orgId: string | null = null;
  if (orgSlug) {
    const [match] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);
    if (match) orgId = match.id;
  }
  if (!orgId) {
    const active = await getActiveOrg();
    orgId = active?.id ?? null;
  }
  if (!orgId) {
    return { ok: false, message: "Pick a company first." };
  }

  try {
    await db.insert(calendarEvents).values({
      orgId,
      title,
      date: startAt!,
      endDate: endAt,
      location: location || null,
      notes: notes || null,
      clientName: clientName || null,
      agentEmail: agentEmail || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, message: `Couldn't save event: ${message}` };
  }

  revalidatePath("/team");
  revalidatePath("/calendarly");
  return { ok: true, message: "Event scheduled." };
}

export async function deleteTeamEvent(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const active = await getActiveOrg();
  if (!active) return;
  // Allow deleting any team event in EITHER org (Team Calendar is cross-org).
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  revalidatePath("/team");
  revalidatePath("/calendarly");
}
