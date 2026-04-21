// Plain server-importable helpers for keeping the Mailing List synced
// with Client data. Not a "use server" module so internal callers don't
// hit the "only async functions" restriction.

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, organizations, type AdditionalContact } from "@/lib/db/schema";

export type ClientLike = {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  licenseNumber?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  website?: string | null;
};

/**
 * Locate an existing Advertisers mailing row for this client in the given
 * org. Matches by case-insensitive email first, then falls back to
 * firstName + lastName + digits-only phone. Returns the row id or null.
 */
async function findAdvertiserMailingRowId(
  orgId: string,
  client: ClientLike,
): Promise<string | null> {
  const firstName = (client.firstName ?? "").trim();
  const email = (client.email ?? "").trim();
  if (!firstName && !email) return null;

  if (email) {
    const byEmail = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.orgId, orgId),
        eq(contacts.type, "mailing"),
        sql`${contacts.tags} @> '["advertiser"]'::jsonb`,
        sql`LOWER(${contacts.email}) = ${email.toLowerCase()}`,
      ))
      .limit(1);
    if (byEmail[0]) return byEmail[0].id;
    return null;
  }

  if (client.phone) {
    const lastName = (client.lastName ?? "").trim();
    const digits = (client.phone ?? "").replace(/[^\d]/g, "");
    if (digits) {
      const byNamePhone = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(
          eq(contacts.orgId, orgId),
          eq(contacts.type, "mailing"),
          sql`${contacts.tags} @> '["advertiser"]'::jsonb`,
          sql`LOWER(${contacts.firstName}) = ${firstName.toLowerCase()}`,
          sql`LOWER(COALESCE(${contacts.lastName}, '')) = ${lastName.toLowerCase()}`,
          sql`REGEXP_REPLACE(COALESCE(${contacts.phone}, ''), '[^0-9]', '', 'g') = ${digits}`,
        ))
        .limit(1);
      if (byNamePhone[0]) return byNamePhone[0].id;
    }
  }
  return null;
}

/**
 * Map an AdditionalContact (from the client form) into the ClientLike
 * shape our sync helpers take. Inherits company from the parent client
 * since Additional Contacts don't carry their own company field.
 * Returns null when the contact has no usable identity at all.
 */
export function additionalContactToClientLike(
  ac: AdditionalContact,
  parent: { company?: string | null },
): ClientLike | null {
  const firstName = (ac.firstName ?? "").trim();
  const email = (ac.email ?? "").trim();
  if (!firstName && !email) return null;
  return {
    firstName: firstName || email,
    lastName:  ac.lastName  || null,
    email:     email        || null,
    phone:     ac.phone     || null,
    title:     ac.title     || null,
    company:   parent.company ?? null,
    address:   ac.address   || null,
    address2:  ac.address2  || null,
    city:      ac.city      || null,
    state:     ac.state     || null,
    zip:       ac.zip       || null,
  };
}

function clientToMailingValues(client: ClientLike) {
  const firstName = (client.firstName ?? "").trim();
  const email = (client.email ?? "").trim();
  return {
    firstName:     firstName || email,
    lastName:      client.lastName      ?? null,
    email:         email || null,
    phone:         client.phone         ?? null,
    company:       client.company       ?? null,
    title:         client.title         ?? null,
    licenseNumber: client.licenseNumber ?? null,
    address:       client.address       ?? null,
    address2:      client.address2      ?? null,
    city:          client.city          ?? null,
    state:         client.state         ?? null,
    zip:           client.zip           ?? null,
    website:       client.website       ?? null,
  };
}

/**
 * Ensure the given client has a row in the Advertisers mailing list.
 * Add-only: if a matching row already exists, does nothing. Used by the
 * manual "Sync Active Clients" backfill so we don't clobber edits users
 * made directly on the mailing page.
 *
 * Returns true if a new mailing row was inserted, false if one already
 * exists (or the input didn't have enough data to safely insert).
 */
export async function ensureAdvertiserMailing(
  orgId: string,
  client: ClientLike,
): Promise<boolean> {
  const firstName = (client.firstName ?? "").trim();
  const email = (client.email ?? "").trim();
  if (!firstName && !email) return false;

  const existingId = await findAdvertiserMailingRowId(orgId, client);
  if (existingId) return false;

  await db.insert(contacts).values({
    orgId,
    type: "mailing",
    ...clientToMailingValues(client),
    tags: ["advertiser"],
  });
  return true;
}

/**
 * Run the add-only active-client → Advertisers sync for a single org.
 * Suitable to call from a cron endpoint: doesn't depend on cookies or
 * an authenticated session. Returns counts for logging.
 */
export async function syncActiveClientsForOrg(orgId: string): Promise<{
  added: number;
  skipped: number;
  errors: number;
}> {
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
      eq(contacts.orgId, orgId),
      eq(contacts.type, "client"),
      eq(contacts.status, "active"),
    ));

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      const didAdd = await ensureAdvertiserMailing(orgId, client);
      if (didAdd) added += 1;
      else skipped += 1;
    } catch (err) {
      errors += 1;
      console.error("[cron sync] primary failed for", client.email ?? client.firstName, err);
    }

    const additionals: AdditionalContact[] = client.additionalContacts ?? [];
    for (const ac of additionals) {
      const mapped = additionalContactToClientLike(ac, { company: client.company });
      if (!mapped) continue;
      try {
        const didAddExtra = await ensureAdvertiserMailing(orgId, mapped);
        if (didAddExtra) added += 1;
        else skipped += 1;
      } catch (err) {
        errors += 1;
        console.error(
          "[cron sync] additional failed for",
          ac.email || [ac.firstName, ac.lastName].filter(Boolean).join(" "),
          err,
        );
      }
    }
  }

  return { added, skipped, errors };
}

/**
 * Run the sync across every org in the database. Entry point for the
 * cron endpoint. Returns totals + per-org breakdown.
 */
export async function syncActiveClientsAllOrgs(): Promise<{
  totalAdded: number;
  totalSkipped: number;
  totalErrors: number;
  orgs: { orgId: string; slug: string; added: number; skipped: number; errors: number }[];
}> {
  const orgs = await db.select({ id: organizations.id, slug: organizations.slug }).from(organizations);
  const report: { orgId: string; slug: string; added: number; skipped: number; errors: number }[] = [];
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  for (const org of orgs) {
    const res = await syncActiveClientsForOrg(org.id);
    totalAdded += res.added;
    totalSkipped += res.skipped;
    totalErrors += res.errors;
    report.push({ orgId: org.id, slug: org.slug, ...res });
  }
  return { totalAdded, totalSkipped, totalErrors, orgs: report };
}

/**
 * Upsert the Advertisers mailing row for this client. If one exists,
 * update it with the client's current contact + address fields; if
 * not, insert. Used by the client create / update actions so edits on
 * the Clients page flow straight into the Advertisers list.
 */
export async function upsertAdvertiserMailing(
  orgId: string,
  client: ClientLike,
): Promise<{ added: boolean; updated: boolean }> {
  const firstName = (client.firstName ?? "").trim();
  const email = (client.email ?? "").trim();
  if (!firstName && !email) return { added: false, updated: false };

  const existingId = await findAdvertiserMailingRowId(orgId, client);
  if (existingId) {
    await db
      .update(contacts)
      .set({ ...clientToMailingValues(client), updatedAt: new Date() })
      .where(eq(contacts.id, existingId));
    return { added: false, updated: true };
  }

  await db.insert(contacts).values({
    orgId,
    type: "mailing",
    ...clientToMailingValues(client),
    tags: ["advertiser"],
  });
  return { added: true, updated: false };
}
