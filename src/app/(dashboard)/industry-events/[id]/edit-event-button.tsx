"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  EventForm,
  type EventFormOptions,
  type EventInitialValues,
} from "../event-form";

export function EditEventButton({
  initial,
  options,
}: {
  initial: EventInitialValues;
  options: EventFormOptions;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3.5 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      {open && (
        <EventForm
          options={options}
          initial={initial}
          onClose={() => setOpen(false)}
          modeLabel="Edit Event"
        />
      )}
    </>
  );
}
