"use server";

import { revalidatePath } from "next/cache";
import { setActiveOrgCookie } from "@/lib/auth/active-org";

/**
 * Server action invoked by the sidebar's org switcher.
 * Persists the chosen org in a cookie and revalidates the current tree so
 * every server component re-renders with the new scope.
 */
export async function switchOrg(slug: string): Promise<void> {
  await setActiveOrgCookie(slug);
  revalidatePath("/", "layout");
}
