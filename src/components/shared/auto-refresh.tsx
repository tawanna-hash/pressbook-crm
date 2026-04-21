"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Drop-in client component that soft-refreshes the surrounding server
 * component tree on an interval. Useful for pages that are kept open and
 * expect background jobs (like cron sync) to update the underlying data.
 *
 * Also refreshes on visibility / focus, so you immediately see fresh data
 * after switching back from another tab without waiting for the tick.
 *
 *   <AutoRefresh intervalMs={60_000} />
 */
export function AutoRefresh({
  intervalMs = 60_000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function tick() {
      // Skip if the tab is hidden — no point refreshing background tabs.
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") router.refresh();
    }

    timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
