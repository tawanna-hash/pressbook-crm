"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZES, type PageSize } from "./pagination-helpers";

// Re-export helpers from the non-client module for callers that already
// import from "@/components/shared/pagination". Only types and constants
// are re-exported here; parsePagination is in the helpers module and must
// be imported from there directly in server components.
export { PAGE_SIZES, type PageSize } from "./pagination-helpers";

/**
 * Footer bar showing "Showing X–Y of Z", page size selector, prev/next.
 * Preserves all other search params on navigation.
 */
export function Pagination({
  total,
  page,
  pageSize,
  rowsOnPage,
}: {
  total: number;
  page: number;
  pageSize: PageSize;
  /** Optional — how many rows are actually rendered on this page. */
  rowsOnPage?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const to = total === 0
    ? 0
    : Math.min(clampedPage * pageSize, (clampedPage - 1) * pageSize + (rowsOnPage ?? pageSize), total);

  function buildHref(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  function onSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextSize = parseInt(e.target.value, 10) as PageSize;
    // Reset to page 1 when size changes so we don't land past the end.
    router.replace(buildHref({ size: nextSize, page: 1 }));
  }

  const canPrev = clampedPage > 1;
  const canNext = clampedPage < pageCount;

  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-3 text-[12px] text-text-2 sm:flex-row">
      <div className="inline-flex items-center gap-2">
        <label htmlFor="page-size" className="text-text-2">
          Rows per page
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={onSizeChange}
          className="rounded-[var(--r)] border border-border bg-card px-2 py-1 text-[12px] text-text focus:border-pb-navy focus:outline-none"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="inline-flex items-center gap-3">
        <span>
          {total === 0 ? (
            <>No results</>
          ) : (
            <>
              <span className="font-medium text-text">{from.toLocaleString()}</span>
              {" – "}
              <span className="font-medium text-text">{to.toLocaleString()}</span>
              {" of "}
              <span className="font-medium text-text">{total.toLocaleString()}</span>
            </>
          )}
        </span>
        <div className="inline-flex items-center overflow-hidden rounded-[var(--r)] border border-border bg-card">
          <button
            type="button"
            onClick={() => router.replace(buildHref({ page: clampedPage - 1 }))}
            disabled={!canPrev}
            aria-label="Previous page"
            className="flex h-7 w-7 items-center justify-center text-text-2 transition-colors hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 text-[11px] text-text">
            Page {clampedPage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => router.replace(buildHref({ page: clampedPage + 1 }))}
            disabled={!canNext}
            aria-label="Next page"
            className="flex h-7 w-7 items-center justify-center text-text-2 transition-colors hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
