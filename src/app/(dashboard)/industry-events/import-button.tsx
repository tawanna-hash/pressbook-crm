"use client";

import { useState } from "react";
import { CalendarDays, FileSpreadsheet, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportIndustryEventsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="secondary"
        size="md"
        leftIcon={<Upload className="h-3.5 w-3.5" />}
      >
        Import
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div className="w-full max-w-2xl rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Upload className="h-4 w-4 text-pb-navy" />
                <h2 className="text-base font-semibold text-text">
                  Import Industry Events
                </h2>
              </div>
              <Button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                variant="ghost"
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <p className="text-[13px] text-text-2">
                Upload a file to import industry events. Supported formats:
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormatCard
                  icon={CalendarDays}
                  name="ICS / iCal"
                  ext=".ics"
                  note="Google Calendar, Outlook, Apple Calendar"
                />
                <FormatCard
                  icon={FileText}
                  name="CSV"
                  ext=".csv"
                  note="Spreadsheet export with headers"
                />
                <FormatCard
                  icon={FileSpreadsheet}
                  name="Excel"
                  ext=".xlsx / .xls"
                  note="Microsoft Excel workbook"
                />
              </div>

              <div className="rounded-[var(--r)] border border-border bg-muted-bg px-4 py-3 text-[12.5px] text-text-2">
                <div className="mb-1 font-semibold text-text">
                  CSV / Excel column headers recognized:
                </div>
                <div className="space-x-2">
                  <code className="rounded bg-card px-1.5 py-0.5 text-[11px] text-text">
                    title, name, event
                  </code>
                  <code className="rounded bg-card px-1.5 py-0.5 text-[11px] text-text">
                    date, start, start date, dtstart
                  </code>
                  <code className="rounded bg-card px-1.5 py-0.5 text-[11px] text-text">
                    end, end date, dtend
                  </code>
                  <code className="rounded bg-card px-1.5 py-0.5 text-[11px] text-text">
                    organizer, host
                  </code>
                  <code className="rounded bg-card px-1.5 py-0.5 text-[11px] text-text">
                    location, venue
                  </code>
                  <code className="rounded bg-card px-1.5 py-0.5 text-[11px] text-text">
                    category
                  </code>
                  <code className="rounded bg-card px-1.5 py-0.5 text-[11px] text-text">
                    notes, description
                  </code>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-[var(--r)] border-2 border-dashed border-border px-6 py-10 text-center">
                <Upload className="mb-2 h-6 w-6 text-text-3" />
                <p className="mb-1 text-[13px] font-medium text-text">
                  Click to choose file
                </p>
                <p className="text-[11px] text-text-2">
                  .ics, .csv, .xlsx, .xls
                </p>
                <p className="mt-3 text-[11px] font-medium text-pb-amber">
                  Import wiring coming next session — placeholder for now.
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-border px-6 py-4">
              <Button
                type="button"
                onClick={() => setOpen(false)}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FormatCard({
  icon: Icon,
  name,
  ext,
  note,
}: {
  icon: typeof Upload;
  name: string;
  ext: string;
  note: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--r)] border border-border bg-muted-bg p-4 text-center">
      <Icon className="mb-2 h-7 w-7 text-text-2" />
      <div className="text-[13px] font-semibold text-text">{name}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
        {ext}
      </div>
      <div className="mt-1 text-[11px] text-text-2">{note}</div>
    </div>
  );
}
