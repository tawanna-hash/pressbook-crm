"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { type AdditionalContact } from "@/lib/db/schema";
import {
  updateClient,
  deleteClient,
  type ClientFormState,
} from "../actions";
import {
  ClientFormFields,
  type ClientInitialValues,
} from "../client-form-fields";

const INITIAL: ClientFormState = { ok: false, message: "" };

type Props = {
  client: ClientInitialValues & {
    id: string;
    additionalContacts: AdditionalContact[] | null;
  };
};

export function EditClientForm({ client }: Props) {
  const [state, formAction, pending] = useActionState(updateClient, INITIAL);

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
        <input type="hidden" name="id" value={client.id} />

        <ClientFormFields initial={client} errors={state.fieldErrors} />

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
            <Link
              href="/clients"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-pb-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pb-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-6">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-foreground">
            Danger zone
          </h3>
          <p className="mt-1 text-sm text-muted">
            Deleting this client removes their record from the CRM. If they
            have an active portal login, they&rsquo;ll lose access.
          </p>
        </div>
        <form
          action={deleteClient}
          onSubmit={(e) => {
            if (!confirm("Delete this client? This can't be undone.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={client.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-pb-red transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete client
          </button>
        </form>
      </div>
    </div>
  );
}
