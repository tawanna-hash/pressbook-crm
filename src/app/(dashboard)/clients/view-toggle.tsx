"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { List, LayoutGrid } from "lucide-react";

export type ViewMode = "list" | "cards";

const OPTIONS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: "list",  label: "List",  icon: List },
  { value: "cards", label: "Cards", icon: LayoutGrid },
];

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current: ViewMode =
    searchParams.get("view") === "cards" ? "cards" : "list";

  function setView(next: ViewMode) {
    if (next === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") {
      params.delete("view");
    } else {
      params.set("view", next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="inline-flex items-center rounded-lg bg-white p-0.5 ring-1 ring-border shadow-sm"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setView(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-pb-navy text-white"
                : "text-foreground hover:bg-gray-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
