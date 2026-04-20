"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="primary"
          size="lg"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {label}
        </Button>
      );
    }
    if (variant === "ghost") {
      return (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="secondary"
          size="md"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          {label}
        </Button>
      );
    }
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="primary"
        size="md"
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        {label}
      </Button>
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
