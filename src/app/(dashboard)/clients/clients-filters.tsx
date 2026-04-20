"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type StatusFilter = "all" | "active" | "prospect" | "inactive";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "active",    label: "Active" },
  { value: "prospect",  label: "Prospect" },
  { value: "inactive",  label: "Inactive" },
];

export function ClientsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = (searchParams.get("status") as StatusFilter) || "all";

  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushUrl(nextQ: string, nextStatus: StatusFilter) {
    // Preserve any other params (like ?view=cards) — only update q and status.
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");
    if (nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushUrl(q, status);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const hasFilters = q.trim().length > 0 || status !== "all";

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-[#FAFBFC] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, or company…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/20"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-gray-200 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-gray-200">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                status === opt.value
                  ? "bg-pb-navy text-white"
                  : "text-foreground hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setStatus("all");
            }}
            className="text-xs font-medium text-pb-navy transition-opacity hover:opacity-70"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
