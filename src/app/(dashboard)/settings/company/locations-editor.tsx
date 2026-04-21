"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createOrganizationLocation,
  deleteOrganizationLocation,
  updateOrganizationLocation,
  type LocationResult,
} from "./actions";

export type Location = {
  id: string;
  label: string;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
};

export function LocationsEditor({ locations }: { locations: Location[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-text">Additional Locations</h2>
          <p className="text-[12px] text-text-2">
            Extra offices beyond your primary address. Shown on the client portal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-[var(--r)] border border-dashed border-border px-4 py-6 text-center">
          <MapPin className="mx-auto mb-2 h-5 w-5 text-text-2" />
          <p className="text-[12.5px] text-text-2">
            No additional locations yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <LocationRow key={loc.id} initial={loc} />
          ))}
        </ul>
      )}

      {addOpen && (
        <LocationModal
          mode="create"
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function LocationRow({ initial }: { initial: Location }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirm(`Delete "${initial.label}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteOrganizationLocation(initial.id);
      if (!res.ok) setError(res.message);
    });
  }

  const addressLine = [initial.address, initial.address2].filter(Boolean).join(", ");
  const cityLine = [initial.city, initial.state, initial.zip].filter(Boolean).join(", ");

  return (
    <>
      <li className="flex items-start gap-3 rounded-[var(--r)] border border-border bg-surface-2 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text">{initial.label}</div>
          <div className="mt-0.5 text-[12px] text-text-2">
            {addressLine || <em className="text-text-3">No address</em>}
            {cityLine && <> · {cityLine}</>}
            {initial.phone && <> · {initial.phone}</>}
          </div>
          {error && (
            <div className="mt-1 text-[11px] text-pb-red">{error}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-[var(--r)] border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-text-2 hover:bg-muted-bg"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label="Delete"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--r)] text-text-2 transition-colors hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red disabled:cursor-wait"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </li>

      {editOpen && (
        <LocationModal
          mode="edit"
          initial={initial}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}

function LocationModal({
  mode,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: Location;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<LocationResult | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (mode === "edit" && initial) fd.set("id", initial.id);
    startTransition(async () => {
      const res =
        mode === "edit"
          ? await updateOrganizationLocation(fd)
          : await createOrganizationLocation(fd);
      setResult(res);
      if (res.ok) setTimeout(onClose, 600);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--rlg)] border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold text-text">
            {mode === "edit" ? "Edit Location" : "Add Location"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-2 hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <Field label="Label" name="label" defaultValue={initial?.label ?? "Office"} placeholder="Austin Office" />
          <Field label="Street Address *" name="address" defaultValue={initial?.address ?? ""} required />
          <Field label="Suite / Apt" name="address2" defaultValue={initial?.address2 ?? ""} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="City"  name="city"  defaultValue={initial?.city  ?? ""} />
            <Field label="State" name="state" defaultValue={initial?.state ?? ""} />
            <Field label="ZIP"   name="zip"   defaultValue={initial?.zip   ?? ""} />
          </div>
          <Field label="Phone" name="phone" defaultValue={initial?.phone ?? ""} />

          {result && (
            <div
              className={`flex items-center gap-2 rounded-[var(--r)] px-3 py-2 text-[12.5px] ${
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
              onClick={onClose}
              className="rounded-[var(--r)] border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-text-2 hover:bg-muted-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending ? "Saving…" : mode === "edit" ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-2">
        {label}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/20"
      />
    </div>
  );
}
