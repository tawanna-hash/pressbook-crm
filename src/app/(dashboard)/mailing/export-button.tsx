"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";

export type ExportRow = Record<string, string | number | null | undefined>;

export function ExportButton({
  rows,
  filename,
  disabled,
}: {
  rows: ExportRow[];
  filename: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function download(blob: Blob, ext: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function exportCsv(delimiter: "," | "\t") {
    const csv = Papa.unparse(rows, { delimiter, header: true });
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
    download(blob, delimiter === "\t" ? "tsv" : "csv");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    download(blob, "json");
  }

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mailing List");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    download(blob, "xlsx");
  }

  const empty = rows.length === 0;

  return (
    <div className="relative inline-block" ref={ref}>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || empty}
        leftIcon={<Download className="h-3.5 w-3.5" />}
        title={empty ? "No rows to export" : undefined}
      >
        Export
        <ChevronDown className="h-3 w-3 opacity-70" />
      </Button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-[var(--r)] border border-border bg-card shadow-lg">
          <ExportOption
            icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            label="CSV (.csv)"
            onClick={() => exportCsv(",")}
          />
          <ExportOption
            icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            label="TSV (.tsv)"
            onClick={() => exportCsv("\t")}
          />
          <ExportOption
            icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            label="Excel (.xlsx)"
            onClick={exportXlsx}
          />
          <ExportOption
            icon={<FileJson className="h-3.5 w-3.5" />}
            label="JSON (.json)"
            onClick={exportJson}
          />
        </div>
      )}
    </div>
  );
}

function ExportOption({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-text hover:bg-muted-bg"
    >
      <span className="text-text-2">{icon}</span>
      {label}
    </button>
  );
}
