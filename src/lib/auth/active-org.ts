import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

const ACTIVE_ORG_COOKIE = "pb_active_org";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type ActiveOrg = {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
};

/**
 * Get the active organization for the current request.
 *
 * Resolution:
 *   1. If the cookie points to an existing org → return it.
 *   2. Otherwise return the first org (alphabetical by slug).
 *   3. If no orgs exist at all, return null.
 */
export async function getActiveOrg(): Promise<ActiveOrg | null> {
  const store = await cookies();
  const slugFromCookie = store.get(ACTIVE_ORG_COOKIE)?.value;

  if (slugFromCookie) {
    const [match] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slugFromCookie))
      .limit(1);
    if (match) {
      return {
        id: match.id,
        slug: match.slug,
        name: match.name,
        brandColor: match.brandColor,
      };
    }
  }

  const [first] = await db
    .select()
    .from(organizations)
    .orderBy(asc(organizations.slug))
    .limit(1);

  if (!first) return null;
  return {
    id: first.id,
    slug: first.slug,
    name: first.name,
    brandColor: first.brandColor,
  };
}

/**
 * Retrieve every organization (used for the sidebar switcher).
 */
export async function listOrgs(): Promise<ActiveOrg[]> {
  const rows = await db
    .select()
    .from(organizations)
    .orderBy(asc(organizations.slug));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    brandColor: r.brandColor,
  }));
}

/**
 * Server-side helper to persist the active-org choice in a cookie.
 * Called from the sidebar switcher's server action.
 */
export async function setActiveOrgCookie(slug: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}
