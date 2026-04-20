"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Drop-in client component that triggers a soft refresh of the surrounding
 * server component tree when:
 *   - the tab becomes visible again (e.g. switching back from a vote tab)
 *   - the window regains focus
 *
 * Combined with `revalidatePath(...)` on the server action, this makes
 * changes made in another tab show up here without a hard reload.
 */
export function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    const onFocus = () => router.refresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}
