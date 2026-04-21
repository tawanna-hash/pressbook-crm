"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { uploadPortalFile, type UploadResult } from "./actions";

type ClientOption = { id: string; name: string };

export function UploadButton({
  role,
  clientOptions = [],
}: {
  role: "client" | "staff";
  clientOptions?: ClientOption[];
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contactId, setContactId] = useState<string>("all");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setResult(null);
    setContactId("all");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    if (role === "staff") fd.set("contactId", contactId);
    startTransition(async () => {
      const res = await uploadPortalFile(fd);
      setResult(res);
      if (res.ok) setTimeout(close, 900);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-pb-navy px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Upload className="h-3.5 w-3.5" />
        Upload
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Upload File</h2>
                <p className="text-xs text-muted">Max 5 MB per file.</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3 px-5 py-4">
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  setResult(null);
                  setFile(e.target.files?.[0] ?? null);
                }}
                className="block w-full rounded-lg border border-border bg-[#FAFBFC] px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-pb-navy file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
              />

              {role === "staff" && clientOptions.length > 0 && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Share with
                  </label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-[#FAFBFC] px-3 py-2 text-sm text-foreground focus:border-pb-navy focus:outline-none"
                  >
                    <option value="all">All clients (general)</option>
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {result && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    result.ok
                      ? "bg-[rgba(16,185,129,0.08)] text-pb-green"
                      : "bg-[rgba(219,25,36,0.08)] text-pb-red"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {result.message}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file || pending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pb-navy px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {pending ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
