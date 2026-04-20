"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="primary"
        size="md"
        leftIcon={<Pencil className="h-3.5 w-3.5" />}
      >
        Edit
      </Button>
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
