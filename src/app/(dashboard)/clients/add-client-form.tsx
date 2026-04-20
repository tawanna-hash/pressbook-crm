"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, UserPlus, X } from "lucide-react";
import { createClient, type ClientFormState } from "./actions";
import { ClientFormFields } from "./client-form-fields";
import { Button, buttonClasses } from "@/components/ui/button";

const INITIAL: ClientFormState = { ok: false, message: "" };

/**
 * Collapsible Add Client panel. Shows as a button until the user clicks
 * "Add client" — then expands into the full multi-section form.
 */
export function AddClientForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createClient, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      // Auto-close after a success. Keep the success message visible briefly.
      const t = setTimeout(() => setOpen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (!open) {
    return (
      <div className="flex items-center justify-end">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="primary"
          size="md"
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Add Client
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
          >
            <UserPlus className="h-4 w-4 text-pb-navy" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Add Client
            </h2>
            <p className="text-xs text-muted">
              Portal access is granted when Status is Active.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-full p-2 text-muted hover:bg-gray-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form ref={formRef} action={formAction} className="px-6 py-5">
        <ClientFormFields errors={state.fieldErrors} />

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
          {state.message ? (
            <div
              className={`flex items-center gap-2 text-sm ${
                state.ok ? "text-pb-green" : "text-pb-red"
              }`}
            >
              {state.ok ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{state.message}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              variant="primary"
              size="md"
            >
              {pending ? "Saving…" : "Save Client"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
