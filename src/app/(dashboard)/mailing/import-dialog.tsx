"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { importMappedMailingContacts, type ImportResult } from "./actions";
import {
  IMPORT_FIELDS,
  guessField,
  splitFullName,
  type CanonicalImportField,
} from "./columns-config";
import type { MailingSegment } from "./mailing-options";

type Step = "pick" | "map" | "done";

type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
};

export function ImportDialog({
  segment,
  open,
  onClose,
}: {
  segment: MailingSegment;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, CanonicalImportField>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep("pick");
    setFile(null);
    setParsed(null);
    setMapping({});
    setParseError(null);
    setResult(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFileChosen(f: File) {
    setFile(f);
    setParseError(null);
    try {
      const parsedFile = await parseClientSide(f);
      if (parsedFile.rows.length === 0) {
        setParseError("File had no rows.");
        return;
      }
      // Seed mapping from heuristic
      const seed: Record<string, CanonicalImportField> = {};
      for (const h of parsedFile.headers) seed[h] = guessField(h);
      setParsed(parsedFile);
      setMapping(seed);
      setStep("map");
    } catch (err) {
      setParseError((err as Error).message);
    }
  }

  function setFieldFor(header: string, field: CanonicalImportField) {
    setMapping((m) => ({ ...m, [header]: field }));
  }

  const usedFields = useMemo(() => {
    const used = new Set<string>();
    for (const v of Object.values(mapping)) {
      if (v !== "skip" && v !== "fullName") used.add(v);
    }
    return used;
  }, [mapping]);

  function applyMapping(
    rows: Record<string, string>[],
    mappingLocal: Record<string, CanonicalImportField>,
  ) {
    return rows.map((r) => {
      const out: Record<string, string> = {};
      for (const [header, rawValue] of Object.entries(r)) {
        const field = mappingLocal[header];
        if (!field || field === "skip") continue;
        const value = (rawValue ?? "").toString().trim();
        if (!value) continue;
        if (field === "fullName") {
          const { firstName, lastName } = splitFullName(value);
          if (firstName && !out.firstName) out.firstName = firstName;
          if (lastName && !out.lastName) out.lastName = lastName;
        } else {
          if (!out[field]) out[field] = value;
        }
      }
      return out;
    });
  }

  const previewRows = useMemo(() => {
    if (!parsed) return [];
    return applyMapping(parsed.rows.slice(0, 3), mapping);
  }, [parsed, mapping]);

  function handleSubmit() {
    if (!parsed) return;
    const mapped = applyMapping(parsed.rows, mapping);
    startTransition(async () => {
      const res = await importMappedMailingContacts(segment, mapped);
      setResult(res);
      if (res.ok) {
        setStep("done");
        setTimeout(close, 1800);
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-[var(--rlg)] border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Import List</h2>
            <p className="text-[12px] text-text-2">
              {step === "pick"
                ? "CSV, TSV, XLSX, XLS, or JSON."
                : step === "map"
                  ? "Match each column in your file to a field in the CRM."
                  : "Success."}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-text-2 hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "pick" && (
          <div className="space-y-4 px-5 py-5">
            <input
              type="file"
              accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChosen(f);
              }}
              className="block w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text file:mr-3 file:rounded-[var(--r)] file:border-0 file:bg-pb-navy file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white hover:file:opacity-90"
            />
            {file && !parseError && (
              <p className="text-[12px] text-text-2">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            {parseError && (
              <div className="flex items-center gap-2 rounded-[var(--r)] bg-[rgba(219,25,36,0.08)] px-3 py-2 text-[12.5px] text-pb-red">
                <AlertCircle className="h-3.5 w-3.5" />
                {parseError}
              </div>
            )}
            <div className="rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[11px] text-text-2">
              After you pick a file, you&apos;ll see its columns on the next screen
              and can map each one to the CRM field it represents.
            </div>
          </div>
        )}

        {step === "map" && parsed && (
          <div className="flex max-h-[70vh] flex-col overflow-hidden">
            <div className="overflow-y-auto px-5 py-4">
              <div className="mb-3 rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[11.5px] text-text-2">
                Detected <span className="font-semibold text-text">
                  {parsed.headers.length}
                </span>{" "}
                column{parsed.headers.length === 1 ? "" : "s"} and{" "}
                <span className="font-semibold text-text">{parsed.rows.length}</span>{" "}
                row{parsed.rows.length === 1 ? "" : "s"}. We pre-matched what we
                could — adjust anything that looks off.
              </div>

              {/* Mapping table */}
              <div className="overflow-hidden rounded-[var(--r)] border border-border">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border bg-muted-bg text-[10px] uppercase tracking-wider text-text-2">
                      <th className="px-3 py-2 text-left font-semibold">Your column</th>
                      <th className="px-3 py-2 text-left font-semibold">Sample</th>
                      <th className="px-3 py-2 text-left font-semibold">Maps to</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsed.headers.map((header) => {
                      const sample = parsed.rows[0]?.[header] ?? "";
                      const field = mapping[header] ?? "skip";
                      return (
                        <tr key={header}>
                          <td className="px-3 py-2 font-medium text-text">{header}</td>
                          <td className="px-3 py-2 text-text-2">
                            <span className="line-clamp-1 max-w-[200px] text-[11.5px]">
                              {sample || <em className="text-text-3">—</em>}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={field}
                              onChange={(e) =>
                                setFieldFor(header, e.target.value as CanonicalImportField)
                              }
                              className="w-full rounded-[var(--r)] border border-border bg-card px-2 py-1 text-[12px] text-text focus:border-pb-navy focus:outline-none"
                            >
                              {IMPORT_FIELDS.map((f) => (
                                <option
                                  key={f.id}
                                  value={f.id}
                                  // Grey out fields already mapped elsewhere
                                  disabled={
                                    f.id !== field &&
                                    f.id !== "skip" &&
                                    f.id !== "fullName" &&
                                    usedFields.has(f.id)
                                  }
                                >
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Preview */}
              {previewRows.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-2">
                    Preview (first {previewRows.length})
                  </div>
                  <div className="overflow-x-auto rounded-[var(--r)] border border-border">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-border bg-muted-bg text-[10px] uppercase tracking-wider text-text-2">
                          {PREVIEW_COLUMNS.map((col) => (
                            <th key={col.id} className="px-3 py-2 text-left font-semibold">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {previewRows.map((r, i) => (
                          <tr key={i}>
                            {PREVIEW_COLUMNS.map((col) => (
                              <td key={col.id} className="px-3 py-2 text-text">
                                {r[col.id] ?? <span className="text-text-3">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result && !result.ok && (
                <div className="mt-3 flex items-center gap-2 rounded-[var(--r)] bg-[rgba(219,25,36,0.08)] px-3 py-2 text-[12.5px] text-pb-red">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {result.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStep("pick")}
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={pending}
                  leftIcon={
                    pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {pending ? "Importing…" : `Import ${parsed.rows.length} row${parsed.rows.length === 1 ? "" : "s"}`}
                  {!pending && <ArrowRight className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "done" && result?.ok && (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(16,185,129,0.12)] text-pb-green">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-semibold text-text">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const PREVIEW_COLUMNS = [
  { id: "firstName", label: "First" },
  { id: "lastName",  label: "Last" },
  { id: "email",     label: "Email" },
  { id: "phone",     label: "Phone" },
  { id: "company",   label: "Company" },
  { id: "licenseNumber", label: "License" },
] as const;

async function parseClientSide(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  const ext = name.substring(name.lastIndexOf(".") + 1);

  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    const rows: Record<string, string>[] = Array.isArray(data)
      ? (data as Record<string, unknown>[]).map((r) => rowToStrings(r))
      : Array.isArray((data as { rows?: unknown[] })?.rows)
        ? (data as { rows: Record<string, unknown>[] }).rows.map((r) => rowToStrings(r))
        : [];
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const first = wb.SheetNames[0];
    const sheet = wb.Sheets[first];
    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: "",
    }) as Record<string, unknown>[];
    const rows = rawRows.map(rowToStrings);
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  // csv/tsv/txt
  const text = await file.text();
  const delimiter = ext === "tsv" ? "\t" : "";
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: delimiter || undefined,
  });
  if (parsed.errors.length && !parsed.data.length) {
    throw new Error(parsed.errors[0].message);
  }
  const rows = parsed.data.map(rowToStrings);
  const headers = parsed.meta?.fields ?? (rows[0] ? Object.keys(rows[0]) : []);
  return { headers, rows };
}

function rowToStrings(r: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v == null) out[k] = "";
    else out[k] = String(v);
  }
  return out;
}
