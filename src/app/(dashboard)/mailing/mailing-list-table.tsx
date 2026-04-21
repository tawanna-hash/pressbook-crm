"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Columns3,
  Mail,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { Pagination, type PageSize } from "@/components/shared/pagination";
import { ImportButton } from "./import-button";
import { ExportButton } from "./export-button";
import { DedupeButton } from "./dedupe-button";
import { NewContactButton } from "./new-contact-button";
import { RowActions } from "./row-actions";
import { SyncAdvertisersButton } from "./sync-advertisers-button";
import {
  COLUMNS,
  DEFAULT_COLUMN_ORDER,
  DEFAULT_VISIBLE_COLUMNS,
  type ColumnId,
} from "./columns-config";
import {
  segmentLabel,
  segmentToSlug,
  type MailingSegment,
  type SortableColumn,
} from "./mailing-options";

export type MailingRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  licenseNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string; // ISO; server converts before passing
};

type Props = {
  segment: MailingSegment;
  rows: MailingRow[];
  total: number;
  page: number;
  pageSize: PageSize;
  sortCol: SortableColumn;
  sortDir: "asc" | "desc";
};

const STORAGE_VISIBLE = (seg: string) => `mailing:${seg}:columns:visible`;
const STORAGE_ORDER   = (seg: string) => `mailing:${seg}:columns:order`;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function MailingListTable({ segment, rows, total, page, pageSize, sortCol, sortDir }: Props) {
  const slug = segmentToSlug(segment);
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [order, setOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [query, setQuery] = useState("");

  // Load prefs from localStorage after mount
  useEffect(() => {
    const v = safeParse<ColumnId[]>(
      localStorage.getItem(STORAGE_VISIBLE(segment)),
      DEFAULT_VISIBLE_COLUMNS,
    );
    const o = safeParse<ColumnId[]>(
      localStorage.getItem(STORAGE_ORDER(segment)),
      DEFAULT_COLUMN_ORDER,
    );
    // Validate: filter out any unknown ids (schema may change)
    const known = new Set(DEFAULT_COLUMN_ORDER);
    const cleanVisible = v.filter((id) => known.has(id));
    const cleanOrder = o.filter((id) => known.has(id));
    // Ensure order contains every column exactly once
    const missing = DEFAULT_COLUMN_ORDER.filter((id) => !cleanOrder.includes(id));
    setVisible(cleanVisible.length ? cleanVisible : DEFAULT_VISIBLE_COLUMNS);
    setOrder([...cleanOrder, ...missing]);
    setHydrated(true);
  }, [segment]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_VISIBLE(segment), JSON.stringify(visible));
  }, [visible, segment, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_ORDER(segment), JSON.stringify(order));
  }, [order, segment, hydrated]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.firstName, r.lastName, r.email, r.phone, r.company,
        r.title, r.licenseNumber, r.address, r.city, r.state, r.zip,
        r.website, r.notes,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const exportRows = useMemo(() => {
    // Export full columns (not just visible), so users get complete data.
    return filteredRows.map((r) => ({
      firstName:     r.firstName,
      lastName:      r.lastName     ?? "",
      email:         r.email        ?? "",
      phone:         r.phone        ?? "",
      company:       r.company      ?? "",
      title:         r.title        ?? "",
      licenseNumber: r.licenseNumber ?? "",
      address:       r.address      ?? "",
      city:          r.city         ?? "",
      state:         r.state        ?? "",
      zip:           r.zip          ?? "",
      website:       r.website      ?? "",
      notes:         r.notes        ?? "",
      createdAt:     r.createdAt,
    }));
  }, [filteredRows]);

  const visibleInOrder = useMemo(
    () => order.filter((id) => visible.includes(id)),
    [order, visible],
  );

  const orgSlug = "mailing";
  const filename = `${orgSlug}-${slug}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">{segmentLabel(segment)}</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            {total.toLocaleString()} {total === 1 ? "contact" : "contacts"} in this segment
            {query.trim() && filteredRows.length !== rows.length && (
              <>
                {" · "}
                <span className="font-medium text-text">
                  {filteredRows.length} match
                  {filteredRows.length === 1 ? "" : "es"}
                </span>
              </>
            )}
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NewContactButton segment={segment} />
          <ImportButton segment={segment} />
          <ExportButton rows={exportRows} filename={filename} />
          <DedupeButton segment={segment} />
          {segment === "advertiser" && <SyncAdvertisersButton />}
        </div>
      </div>

      {/* Toolbar: search + columns */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, company…"
            className="w-full rounded-[var(--r)] border border-border bg-card py-2 pl-9 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-2 hover:bg-muted-bg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <ColumnsMenu
          visible={visible}
          setVisible={setVisible}
          order={order}
          setOrder={setOrder}
        />
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-dashed border-border bg-card px-6 py-16 text-center shadow-[var(--sh-xs)]">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
            {rows.length === 0 ? (
              <Mail className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </div>
          <h2 className="mb-1 text-[14px] font-semibold text-text">
            {rows.length === 0
              ? `No ${segmentLabel(segment).toLowerCase()} yet`
              : "No matches"}
          </h2>
          <p className="mx-auto max-w-md text-[12.5px] leading-relaxed text-text-2">
            {rows.length === 0
              ? "Use Import to bring in a CSV, TSV, Excel, or JSON file."
              : "Try a different search term or clear the filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted-bg text-[10px] uppercase tracking-wider text-text-2">
                {visibleInOrder.map((id) => {
                  const col = COLUMNS.find((c) => c.id === id)!;
                  return col.sortable ? (
                    <SortHeader
                      key={id}
                      slug={slug}
                      col={id as SortableColumn}
                      current={sortCol}
                      dir={sortDir}
                      label={col.label}
                    />
                  ) : (
                    <th key={id} className="px-4 py-3 text-left font-semibold">
                      {col.label}
                    </th>
                  );
                })}
                <th className="w-10 px-2 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((r) => (
                <tr key={r.id} className="hover:bg-muted-bg">
                  {visibleInOrder.map((id) => (
                    <td key={id} className="px-4 py-3 text-text-2">
                      <CellContent id={id} row={r} />
                    </td>
                  ))}
                  <td className="px-2 py-3 text-right">
                    <RowActions
                      segment={segment}
                      contact={{
                        id:        r.id,
                        firstName: r.firstName,
                        lastName:  r.lastName,
                        email:     r.email,
                        phone:     r.phone,
                        company:   r.company,
                        title:     r.title,
                        address:   r.address,
                        city:      r.city,
                        state:     r.state,
                        zip:       r.zip,
                        website:   r.website,
                        notes:     r.notes,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          rowsOnPage={rows.length}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function CellContent({ id, row }: { id: ColumnId; row: MailingRow }) {
  switch (id) {
    case "firstName":
      return <span className="font-medium text-text">{row.firstName}</span>;
    case "email":
      return row.email ? (
        <a href={`mailto:${row.email}`} className="text-pb-navy hover:underline">
          {row.email}
        </a>
      ) : (
        <span className="text-text-3">—</span>
      );
    case "website":
      return row.website ? (
        <a
          href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
          target="_blank"
          rel="noreferrer"
          className="text-pb-navy hover:underline"
        >
          {row.website}
        </a>
      ) : (
        <span className="text-text-3">—</span>
      );
    case "createdAt":
      return (
        <span>
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      );
    default: {
      const val = row[id as keyof MailingRow] as string | null | undefined;
      return val ? <span>{val}</span> : <span className="text-text-3">—</span>;
    }
  }
}

function SortHeader({
  slug,
  col,
  current,
  dir,
  label,
}: {
  slug: string;
  col: SortableColumn;
  current: SortableColumn;
  dir: "asc" | "desc";
  label: string;
}) {
  const active = current === col;
  const nextDir: "asc" | "desc" = active && dir === "asc" ? "desc" : "asc";
  const href = `/mailing/${slug}?sort=${col}&dir=${nextDir}`;
  return (
    <th className="px-4 py-3 text-left font-semibold">
      <Link
        href={href}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? "text-text" : "text-text-2 hover:text-text"
        }`}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </Link>
    </th>
  );
}

function ColumnsMenu({
  visible,
  setVisible,
  order,
  setOrder,
}: {
  visible: ColumnId[];
  setVisible: (next: ColumnId[]) => void;
  order: ColumnId[];
  setOrder: (next: ColumnId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(id: ColumnId) {
    const next = visible.includes(id)
      ? visible.filter((x) => x !== id)
      : [...visible, id];
    // Ensure firstName is always shown — otherwise the row collapses to nothing.
    if (!next.includes("firstName")) next.unshift("firstName");
    setVisible(next);
  }

  function move(id: ColumnId, direction: -1 | 1) {
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  }

  function reset() {
    setVisible(DEFAULT_VISIBLE_COLUMNS);
    setOrder(DEFAULT_COLUMN_ORDER);
  }

  const ordered = order.map((id) => COLUMNS.find((c) => c.id === id)!).filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[12.5px] font-medium text-text transition-colors hover:bg-muted-bg"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-72 rounded-[var(--r)] border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-2">
              Columns
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-pb-navy hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {ordered.map((col, idx) => {
              const shown = visible.includes(col.id);
              const atTop = idx === 0;
              const atBottom = idx === ordered.length - 1;
              return (
                <li
                  key={col.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted-bg"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shown}
                      onChange={() => toggle(col.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className={`text-[12.5px] ${shown ? "text-text" : "text-text-2"}`}>
                      {col.label}
                    </span>
                  </label>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(col.id, -1)}
                      disabled={atTop}
                      aria-label="Move up"
                      className="flex h-6 w-6 items-center justify-center rounded text-text-2 transition-colors hover:bg-muted-bg hover:text-text disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(col.id, 1)}
                      disabled={atBottom}
                      aria-label="Move down"
                      className="flex h-6 w-6 items-center justify-center rounded text-text-2 transition-colors hover:bg-muted-bg hover:text-text disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border px-3 py-2">
            <p className="text-[10.5px] leading-relaxed text-text-2">
              Check to show, uncheck to hide. Use the arrows to reorder. Choices
              are remembered per segment on this device.
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-text-2">
              <Users className="h-3 w-3" />
              First Name is always shown to keep rows readable.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
