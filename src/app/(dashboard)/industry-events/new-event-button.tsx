"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EventForm, type EventFormOptions } from "./event-form";

type Props = {
  options: EventFormOptions;
  variant?: "primary" | "ghost" | "big";
  label?: string;
};

export function NewEventButton({ options, variant = "primary", label = "New Event" }: Props) {
  const [open, setOpen] = useState(false);

  const button = (() => {
    if (variant === "big") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-[var(--r)] bg-pb-navy px-6 py-3 text-[14px] font-semibold text-white shadow-[var(--sh-sm)] transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {label}
        </button>
      );
    }
    if (variant === "ghost") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[var(--r)] border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-text shadow-[var(--sh-xs)] transition-colors hover:bg-muted-bg"
        >
          <Plus className="h-3.5 w-3.5" />
          {label}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3.5 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  })();

  return (
    <>
      {button}
      {open && (
        <EventForm
          options={options}
          onClose={() => setOpen(false)}
          modeLabel="New Event"
        />
      )}
    </>
  );
}
