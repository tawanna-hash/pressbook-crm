"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  contacts,
  type AdditionalContact,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { STATUS_OPTIONS, type ClientStatus } from "./client-options";
import {
  additionalContactToClientLike,
  upsertAdvertiserMailing,
} from "../mailing/sync-helpers";

// ─────────────────────────────────────────────────────────────────────
// Form types & validation helpers
// ─────────────────────────────────────────────────────────────────────

export type ClientFormFieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "email"
    | "portalEmail"
    | "phone"
    | "officePhone"
    | "company"
    | "title"
    | "industry"
    | "status"
    | "website"
    | "licenseNumber"
    | "address"
    | "address2"
    | "city"
    | "state"
    | "zip"
    | "notes",
    string
  >
>;

export type ClientFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: ClientFormFieldErrors;
};

function emailLooksValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readAdditionalContacts(formData: FormData): AdditionalContact[] {
  // Reads up to 2 additional contacts (indexes 0 and 1 — labelled
  // "Additional Contact 2" and "Additional Contact 3" in the UI).
  const out: AdditionalContact[] = [];
  for (let i = 0; i < 2; i++) {
    const firstName = String(formData.get(`addl[${i}].firstName`) ?? "").trim();
    const lastName  = String(formData.get(`addl[${i}].lastName`)  ?? "").trim();
    const email     = String(formData.get(`addl[${i}].email`)     ?? "").trim();
    const title     = String(formData.get(`addl[${i}].title`)     ?? "").trim();
    const phone     = String(formData.get(`addl[${i}].phone`)     ?? "").trim();
    const address   = String(formData.get(`addl[${i}].address`)   ?? "").trim();
    const address2  = String(formData.get(`addl[${i}].address2`)  ?? "").trim();
    const city      = String(formData.get(`addl[${i}].city`)      ?? "").trim();
    const state     = String(formData.get(`addl[${i}].state`)     ?? "").trim();
    const zip       = String(formData.get(`addl[${i}].zip`)       ?? "").trim();
    // Only include the contact row if at least one field is filled.
    if (
      firstName || lastName || email || title || phone ||
      address || address2 || city || state || zip
    ) {
      out.push({
        firstName, lastName, email, title, phone,
        address, address2, city, state, zip,
      });
    }
  }
  return out;
}

type ParsedClient = {
  values: {
    avatarUrl: string;
    firstName: string;
    lastName: string;
    email: string;
    portalEmail: string;
    phone: string;
    officePhone: string;
    company: string;
    title: string;
    website: string;
    industry: string;
    status: ClientStatus;
    licenseNumber: string;
    address: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    notes: string;
    additionalContacts: AdditionalContact[];
  };
  fieldErrors: ClientFormFieldErrors;
};

function parseClientForm(formData: FormData): ParsedClient {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const statusRaw = get("status") || "prospect";
  const status: ClientStatus = (STATUS_OPTIONS as readonly string[]).includes(
    statusRaw,
  )
    ? (statusRaw as ClientStatus)
    : "prospect";

  const values = {
    avatarUrl:      String(formData.get("avatarUrl") ?? ""),
    firstName:      get("firstName"),
    lastName:       get("lastName"),
    email:          get("email").toLowerCase(),
    portalEmail:    get("portalEmail").toLowerCase(),
    phone:          get("phone"),
    officePhone:    get("officePhone"),
    company:        get("company"),
    title:          get("title"),
    website:        get("website"),
    industry:       get("industry"),
    status,
    licenseNumber:  get("licenseNumber"),
    address:        get("address"),
    address2:       get("address2"),
    city:           get("city"),
    state:          get("state"),
    zip:            get("zip"),
    notes:          get("notes"),
    additionalContacts: readAdditionalContacts(formData),
  };

  const fieldErrors: ClientFormFieldErrors = {};
  if (!values.firstName) fieldErrors.firstName = "First name is required.";
  if (!values.email) {
    fieldErrors.email = "Email is required.";
  } else if (!emailLooksValid(values.email)) {
    fieldErrors.email = "That doesn't look like a valid email.";
  }
  if (values.portalEmail && !emailLooksValid(values.portalEmail)) {
    fieldErrors.portalEmail = "That doesn't look like a valid email.";
  }

  return { values, fieldErrors };
}

// ─────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────

export async function createClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { values, fieldErrors } = parseClientForm(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const org = await getActiveOrg();
  if (!org) {
    return {
      ok: false,
      message:
        "No company is active. Switch to RealtyLine or Newsline SA in the sidebar.",
    };
  }

  try {
    await db.insert(contacts).values({
      orgId: org.id,
      avatarUrl: values.avatarUrl || null,
      firstName: values.firstName,
      lastName: values.lastName || null,
      email: values.email,
      portalEmail: values.portalEmail || null,
      phone: values.phone || null,
      officePhone: values.officePhone || null,
      company: values.company || null,
      title: values.title || null,
      website: values.website || null,
      industry: values.industry || null,
      status: values.status,
      licenseNumber: values.licenseNumber || null,
      address: values.address || null,
      address2: values.address2 || null,
      city: values.city || null,
      state: values.state || null,
      zip: values.zip || null,
      notes: values.notes || null,
      additionalContacts: values.additionalContacts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, message: `Couldn't save client: ${message}` };
  }

  // Auto-sync active clients onto the Advertisers mailing list. Each
  // sync is independent so a failure on one contact doesn't swallow the
  // rest. Errors are logged server-side and reported in the success
  // message so they aren't invisible.
  let syncedCount = 0;
  const syncErrors: string[] = [];
  if (values.status === "active") {
    try {
      await upsertAdvertiserMailing(org.id, {
        firstName:     values.firstName,
        lastName:      values.lastName,
        email:         values.email,
        phone:         values.phone,
        company:       values.company,
        title:         values.title,
        licenseNumber: values.licenseNumber,
        address:       values.address,
        address2:      values.address2,
        city:          values.city,
        state:         values.state,
        zip:           values.zip,
        website:       values.website,
      });
      syncedCount += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[createClient] primary Advertisers sync failed:", msg);
      syncErrors.push(`primary: ${msg}`);
    }

    for (const ac of values.additionalContacts) {
      const mapped = additionalContactToClientLike(ac, { company: values.company });
      if (!mapped) continue;
      try {
        await upsertAdvertiserMailing(org.id, mapped);
        syncedCount += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const who = [ac.firstName, ac.lastName].filter(Boolean).join(" ") || ac.email || "additional";
        console.error(`[createClient] ${who} Advertisers sync failed:`, msg);
        syncErrors.push(`${who}: ${msg}`);
      }
    }

    revalidatePath("/mailing/advertisers");
    revalidatePath("/mailing");
  }

  revalidatePath("/clients");

  const base = `Added ${values.firstName} ${values.lastName}`.trim() + ".";
  const tail =
    values.status === "active"
      ? syncErrors.length > 0
        ? ` Synced ${syncedCount} to Advertisers · ${syncErrors.length} failed — check server logs.`
        : ` Synced ${syncedCount} to Advertisers.`
      : "";

  return { ok: true, message: base + tail };
}

// ─────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────

export async function updateClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing client id." };

  const { values, fieldErrors } = parseClientForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    await db
      .update(contacts)
      .set({
        avatarUrl: values.avatarUrl || null,
        firstName: values.firstName,
        lastName: values.lastName || null,
        email: values.email,
        portalEmail: values.portalEmail || null,
        phone: values.phone || null,
        officePhone: values.officePhone || null,
        company: values.company || null,
        title: values.title || null,
        website: values.website || null,
        industry: values.industry || null,
        status: values.status,
        licenseNumber: values.licenseNumber || null,
        address: values.address || null,
        address2: values.address2 || null,
        city: values.city || null,
        state: values.state || null,
        zip: values.zip || null,
        notes: values.notes || null,
        additionalContacts: values.additionalContacts,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, message: `Couldn't save changes: ${message}` };
  }

  // Auto-sync active clients onto the Advertisers mailing list. Each
  // contact syncs independently so one failure doesn't take out the rest.
  let syncedCount = 0;
  const syncErrors: string[] = [];
  if (values.status === "active") {
    const org = await getActiveOrg();
    if (org) {
      try {
        await upsertAdvertiserMailing(org.id, {
          firstName:     values.firstName,
          lastName:      values.lastName,
          email:         values.email,
          phone:         values.phone,
          company:       values.company,
          title:         values.title,
          licenseNumber: values.licenseNumber,
          address:       values.address,
          address2:      values.address2,
          city:          values.city,
          state:         values.state,
          zip:           values.zip,
          website:       values.website,
        });
        syncedCount += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[updateClient] primary Advertisers sync failed:", msg);
        syncErrors.push(`primary: ${msg}`);
      }

      for (const ac of values.additionalContacts) {
        const mapped = additionalContactToClientLike(ac, { company: values.company });
        if (!mapped) continue;
        try {
          await upsertAdvertiserMailing(org.id, mapped);
          syncedCount += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const who = [ac.firstName, ac.lastName].filter(Boolean).join(" ") || ac.email || "additional";
          console.error(`[updateClient] ${who} Advertisers sync failed:`, msg);
          syncErrors.push(`${who}: ${msg}`);
        }
      }

      revalidatePath("/mailing/advertisers");
      revalidatePath("/mailing");
    }
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);

  const tail =
    values.status === "active"
      ? syncErrors.length > 0
        ? ` Synced ${syncedCount} to Advertisers · ${syncErrors.length} failed — check server logs.`
        : ` Synced ${syncedCount} to Advertisers.`
      : "";

  return { ok: true, message: "Changes saved." + tail };
}

// ─────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────

export async function deleteClient(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await db.delete(contacts).where(eq(contacts.id, id));
  revalidatePath("/clients");
  redirect("/clients");
}
