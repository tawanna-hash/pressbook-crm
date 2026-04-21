"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { segmentToSlug, type MailingSegment } from "./mailing-options";
import {
  additionalContactToClientLike,
  ensureAdvertiserMailing,
} from "./sync-helpers";
import type { AdditionalContact } from "@/lib/db/schema";

export type ImportResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  message: string;
};

// Common header aliases → canonical field name
const HEADER_MAP: Record<string, string> = {
  "first_name": "firstName",
  "firstname": "firstName",
  "first name": "firstName",
  "fname": "firstName",
  "given name": "firstName",
  "last_name": "lastName",
  "lastname": "lastName",
  "last name": "lastName",
  "lname": "lastName",
  "surname": "lastName",
  "family name": "lastName",
  "email": "email",
  "email address": "email",
  "e-mail": "email",
  "phone": "phone",
  "phone number": "phone",
  "mobile": "phone",
  "cell": "phone",
  "company": "company",
  "organization": "company",
  "business": "company",
  "employer": "company",
  "title": "title",
  "job title": "title",
  "position": "title",
  "role": "title",
  "address": "address",
  "street": "address",
  "street address": "address",
  "city": "city",
  "state": "state",
  "province": "state",
  "zip": "zip",
  "zipcode": "zip",
  "zip code": "zip",
  "postal code": "zip",
  "postcode": "zip",
  "website": "website",
  "url": "website",
  "notes": "notes",
  "note": "notes",
};

function normalizeKey(k: string): string {
  const cleaned = k.trim().toLowerCase();
  return HEADER_MAP[cleaned] ?? cleaned;
}

function normalizeRow(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = normalizeKey(k);
    if (v == null) continue;
    const str = String(v).trim();
    if (!str) continue;
    // Don't overwrite if already present (first header alias wins)
    if (!out[key]) out[key] = str;
  }
  return out;
}

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const name = file.name.toLowerCase();
  const ext = name.substring(name.lastIndexOf(".") + 1);

  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && Array.isArray((data as { rows?: unknown[] }).rows)) {
      return (data as { rows: Record<string, unknown>[] }).rows;
    }
    throw new Error("JSON must be an array of row objects, or { rows: [...] }.");
  }

  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    return XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" }) as Record<string, unknown>[];
  }

  // Default: CSV / TSV / text delimited
  const text = await file.text();
  const delimiter = ext === "tsv" ? "\t" : "";
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: delimiter || undefined,
  });
  if (parsed.errors.length > 0 && !parsed.data.length) {
    throw new Error(parsed.errors[0].message);
  }
  return parsed.data;
}

export async function importMailingContacts(
  formData: FormData,
): Promise<ImportResult> {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) {
    return { ok: false, inserted: 0, skipped: 0, message: "Select a company first." };
  }

  const file = formData.get("file") as File | null;
  const segment = formData.get("segment") as MailingSegment | null;
  if (!file || !file.name) {
    return { ok: false, inserted: 0, skipped: 0, message: "No file uploaded." };
  }
  if (!segment) {
    return { ok: false, inserted: 0, skipped: 0, message: "Missing segment." };
  }

  let rawRows: Record<string, unknown>[];
  try {
    rawRows = await parseFile(file);
  } catch (err) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      message: `Could not parse file: ${(err as Error).message}`,
    };
  }

  if (rawRows.length === 0) {
    return { ok: false, inserted: 0, skipped: 0, message: "File had no rows." };
  }

  const toInsert: (typeof contacts.$inferInsert)[] = [];
  let skipped = 0;

  for (const raw of rawRows) {
    const r = normalizeRow(raw);
    const firstName = r.firstName || r.email || "";
    if (!firstName) {
      skipped += 1;
      continue;
    }
    toInsert.push({
      orgId: activeOrg.id,
      type: "mailing",
      firstName,
      lastName: r.lastName || null,
      email: r.email || null,
      phone: r.phone || null,
      company: r.company || null,
      title: r.title || null,
      address: r.address || null,
      city: r.city || null,
      state: r.state || null,
      zip: r.zip || null,
      website: r.website || null,
      notes: r.notes || null,
      tags: [segment],
    });
  }

  if (toInsert.length === 0) {
    return { ok: false, inserted: 0, skipped, message: "No rows had a first name or email." };
  }

  // Chunked insert — Postgres parameter limit is 65k; stay well under.
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    await db.insert(contacts).values(slice);
    inserted += slice.length;
  }

  revalidatePath(`/mailing/${segmentToSlug(segment)}`);
  revalidatePath("/mailing");

  return {
    ok: true,
    inserted,
    skipped,
    message: `Imported ${inserted} contact${inserted === 1 ? "" : "s"}${skipped ? ` · skipped ${skipped} invalid row${skipped === 1 ? "" : "s"}` : ""}.`,
  };
}

export async function deleteMailingContact(id: string, segment: MailingSegment) {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) return { ok: false, message: "No active org." };
  await db
    .delete(contacts)
    .where(and(
      eq(contacts.id, id),
      eq(contacts.orgId, activeOrg.id),
      eq(contacts.type, "mailing"),
      sql`${contacts.tags} @> ${JSON.stringify([segment])}::jsonb`,
    ));
  revalidatePath(`/mailing/${segmentToSlug(segment)}`);
  revalidatePath("/mailing");
  return { ok: true as const };
}

/**
 * Move a mailing-list contact from one segment to another.
 * Rewrites the contact's `tags` jsonb array so the old segment tag is
 * removed and the new one added.
 */
export async function moveMailingContact(
  id: string,
  fromSegment: MailingSegment,
  toSegment: MailingSegment,
) {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) return { ok: false, message: "No active org." };
  if (fromSegment === toSegment) {
    return { ok: true as const, message: "Already in that list." };
  }

  // Load existing tags so we preserve anything unrelated (future-proofing).
  const existing = await db
    .select({ tags: contacts.tags })
    .from(contacts)
    .where(and(
      eq(contacts.id, id),
      eq(contacts.orgId, activeOrg.id),
      eq(contacts.type, "mailing"),
    ))
    .limit(1);

  const current = (existing[0]?.tags ?? []) as string[];
  const next = current.filter((t) => t !== fromSegment);
  if (!next.includes(toSegment)) next.push(toSegment);

  await db
    .update(contacts)
    .set({ tags: next, updatedAt: new Date() })
    .where(and(
      eq(contacts.id, id),
      eq(contacts.orgId, activeOrg.id),
      eq(contacts.type, "mailing"),
    ));

  revalidatePath(`/mailing/${segmentToSlug(fromSegment)}`);
  revalidatePath(`/mailing/${segmentToSlug(toSegment)}`);
  revalidatePath("/mailing");
  return { ok: true as const };
}

export type UpdateMailingResult = {
  ok: boolean;
  message: string;
};

/**
 * Update editable fields on a mailing-list contact. Expects a FormData with
 * `id`, `segment`, and any of the editable fields — empty strings are treated
 * as null so the user can clear values.
 */
export async function updateMailingContact(
  formData: FormData,
): Promise<UpdateMailingResult> {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) return { ok: false, message: "Select a company first." };

  const id = formData.get("id") as string | null;
  const segment = formData.get("segment") as MailingSegment | null;
  if (!id || !segment) {
    return { ok: false, message: "Missing id or segment." };
  }

  const str = (key: string): string | null => {
    const v = formData.get(key);
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const firstName = str("firstName");
  if (!firstName) {
    return { ok: false, message: "First name is required." };
  }

  await db
    .update(contacts)
    .set({
      firstName,
      lastName: str("lastName"),
      email:    str("email"),
      phone:    str("phone"),
      company:  str("company"),
      title:    str("title"),
      address:  str("address"),
      city:     str("city"),
      state:    str("state"),
      zip:      str("zip"),
      website:  str("website"),
      notes:    str("notes"),
      updatedAt: new Date(),
    })
    .where(and(
      eq(contacts.id, id),
      eq(contacts.orgId, activeOrg.id),
      eq(contacts.type, "mailing"),
    ));

  revalidatePath(`/mailing/${segmentToSlug(segment)}`);
  revalidatePath("/mailing");
  return { ok: true, message: "Saved." };
}

// ═══════════════════════════════════════════════════════════════
// Mapped import — client pre-parses file + applies user mapping,
// then sends in the canonical row shape below.
// ═══════════════════════════════════════════════════════════════

export type MappedImportRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  notes?: string;
};

export async function importMappedMailingContacts(
  segment: MailingSegment,
  rows: MappedImportRow[],
): Promise<ImportResult> {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) {
    return { ok: false, inserted: 0, skipped: 0, message: "Select a company first." };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, inserted: 0, skipped: 0, message: "No rows to import." };
  }

  const toInsert: (typeof contacts.$inferInsert)[] = [];
  let skipped = 0;

  for (const r of rows) {
    const firstName = (r.firstName ?? "").trim();
    const email     = (r.email ?? "").trim();
    if (!firstName && !email) {
      skipped += 1;
      continue;
    }
    toInsert.push({
      orgId: activeOrg.id,
      type: "mailing",
      firstName: firstName || email,  // fallback to email if no name
      lastName:      r.lastName?.trim()      || null,
      email:         email                    || null,
      phone:         r.phone?.trim()         || null,
      company:       r.company?.trim()       || null,
      title:         r.title?.trim()         || null,
      licenseNumber: r.licenseNumber?.trim() || null,
      address:       r.address?.trim()       || null,
      city:          r.city?.trim()          || null,
      state:         r.state?.trim()         || null,
      zip:           r.zip?.trim()           || null,
      website:       r.website?.trim()       || null,
      notes:         r.notes?.trim()         || null,
      tags: [segment],
    });
  }

  if (toInsert.length === 0) {
    return { ok: false, inserted: 0, skipped, message: "No rows had a first name or email." };
  }

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    await db.insert(contacts).values(slice);
    inserted += slice.length;
  }

  revalidatePath(`/mailing/${segmentToSlug(segment)}`);
  revalidatePath("/mailing");

  return {
    ok: true,
    inserted,
    skipped,
    message: `Imported ${inserted} contact${inserted === 1 ? "" : "s"}${skipped ? ` · skipped ${skipped} invalid row${skipped === 1 ? "" : "s"}` : ""}.`,
  };
}

// ═══════════════════════════════════════════════════════════════
// Sync Active Clients → Advertisers mailing list
// Pulls every type='client' AND status='active' row for the org,
// and inserts an Advertisers mailing row for any that aren't already
// on the list (matched by email, or name+phone when no email).
// ═══════════════════════════════════════════════════════════════

export type SyncAdvertisersResult = {
  ok: boolean;
  added: number;
  skipped: number;
  message: string;
};

export async function syncActiveClientsToAdvertisers(): Promise<SyncAdvertisersResult> {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) {
    return { ok: false, added: 0, skipped: 0, message: "Select a company first." };
  }

  const clients = await db
    .select({
      firstName:          contacts.firstName,
      lastName:           contacts.lastName,
      email:              contacts.email,
      phone:              contacts.phone,
      company:            contacts.company,
      title:              contacts.title,
      licenseNumber:      contacts.licenseNumber,
      address:            contacts.address,
      address2:           contacts.address2,
      city:               contacts.city,
      state:              contacts.state,
      zip:                contacts.zip,
      website:            contacts.website,
      additionalContacts: contacts.additionalContacts,
    })
    .from(contacts)
    .where(and(
      eq(contacts.orgId, activeOrg.id),
      eq(contacts.type, "client"),
      eq(contacts.status, "active"),
    ));

  let added = 0;
  let skipped = 0;
  for (const client of clients) {
    // Primary contact
    const didAddPrimary = await ensureAdvertiserMailing(activeOrg.id, client);
    if (didAddPrimary) added += 1;
    else skipped += 1;

    // Additional Contacts 2 & 3
    const additionals: AdditionalContact[] = client.additionalContacts ?? [];
    for (const ac of additionals) {
      const mapped = additionalContactToClientLike(ac, { company: client.company });
      if (!mapped) continue;
      const didAddExtra = await ensureAdvertiserMailing(activeOrg.id, mapped);
      if (didAddExtra) added += 1;
      else skipped += 1;
    }
  }

  revalidatePath("/mailing/advertisers");
  revalidatePath("/mailing");

  return {
    ok: true,
    added,
    skipped,
    message: clients.length === 0
      ? "No active clients to sync."
      : `Added ${added} · ${skipped} already on list.`,
  };
}

// ═══════════════════════════════════════════════════════════════
// Single-contact create — powers the "New Contact" button on each
// segment page.
// ═══════════════════════════════════════════════════════════════

export type CreateMailingResult = {
  ok: boolean;
  message: string;
};

export async function createMailingContact(
  formData: FormData,
): Promise<CreateMailingResult> {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) return { ok: false, message: "Select a company first." };

  const segment = formData.get("segment") as MailingSegment | null;
  if (!segment) return { ok: false, message: "Missing segment." };

  const str = (key: string): string | null => {
    const v = formData.get(key);
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const firstName = str("firstName");
  const email = str("email");
  if (!firstName && !email) {
    return { ok: false, message: "First name or email is required." };
  }

  await db.insert(contacts).values({
    orgId: activeOrg.id,
    type: "mailing",
    firstName:     firstName || (email as string),
    lastName:      str("lastName"),
    email:         email,
    phone:         str("phone"),
    company:       str("company"),
    title:         str("title"),
    licenseNumber: str("licenseNumber"),
    address:       str("address"),
    city:          str("city"),
    state:         str("state"),
    zip:           str("zip"),
    website:       str("website"),
    notes:         str("notes"),
    tags: [segment],
  });

  revalidatePath(`/mailing/${segmentToSlug(segment)}`);
  revalidatePath("/mailing");
  return { ok: true, message: "Contact added." };
}

// ═══════════════════════════════════════════════════════════════
// Duplicate cleanup — finds duplicates within a segment and keeps
// the oldest row. Strategy picks which fields form the dedupe key.
// ═══════════════════════════════════════════════════════════════

export type DedupeStrategy = "email" | "name_phone";

export type DedupeResult = {
  ok: boolean;
  removed: number;
  inspected: number;
  message: string;
};

function dedupeKey(
  r: { firstName: string; lastName: string | null; email: string | null; phone: string | null },
  strategy: DedupeStrategy,
): string | null {
  if (strategy === "email") {
    const e = (r.email ?? "").trim().toLowerCase();
    return e || null;
  }
  // name_phone
  const f = r.firstName.trim().toLowerCase();
  const l = (r.lastName ?? "").trim().toLowerCase();
  const p = (r.phone ?? "").trim().replace(/[^\d]/g, "");
  if (!f && !p) return null;
  return `${f}|${l}|${p}`;
}

export async function dedupeMailingContacts(
  segment: MailingSegment,
  strategy: DedupeStrategy,
): Promise<DedupeResult> {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) {
    return { ok: false, removed: 0, inspected: 0, message: "Select a company first." };
  }

  const rows = await db
    .select({
      id:        contacts.id,
      firstName: contacts.firstName,
      lastName:  contacts.lastName,
      email:     contacts.email,
      phone:     contacts.phone,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(and(
      eq(contacts.orgId, activeOrg.id),
      eq(contacts.type, "mailing"),
      sql`${contacts.tags} @> ${JSON.stringify([segment])}::jsonb`,
    ));

  // Group by dedupe key, keep the oldest row, collect the rest for deletion.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = dedupeKey(r, strategy);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const toDelete: string[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    // Keep the first (oldest), delete the rest.
    for (let i = 1; i < list.length; i += 1) {
      toDelete.push(list[i].id);
    }
  }

  if (toDelete.length === 0) {
    return {
      ok: true,
      removed: 0,
      inspected: rows.length,
      message: "No duplicates found.",
    };
  }

  // Delete in chunks — the IN (...) clause is unbounded but stay modest.
  const CHUNK = 500;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const slice = toDelete.slice(i, i + CHUNK);
    await db
      .delete(contacts)
      .where(and(
        eq(contacts.orgId, activeOrg.id),
        eq(contacts.type, "mailing"),
        inArray(contacts.id, slice),
      ));
  }

  revalidatePath(`/mailing/${segmentToSlug(segment)}`);
  revalidatePath("/mailing");

  return {
    ok: true,
    removed: toDelete.length,
    inspected: rows.length,
    message: `Removed ${toDelete.length} duplicate${toDelete.length === 1 ? "" : "s"} out of ${rows.length} contact${rows.length === 1 ? "" : "s"}.`,
  };
}
