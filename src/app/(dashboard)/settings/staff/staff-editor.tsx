"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  X,
} from "lucide-react";
import { updateStaffMember, type StaffResult } from "./actions";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  locationId: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  mobile: string | null;
};

export type LocationOption = {
  id: string;
  label: string;
};

export function StaffEditor({
  staff,
  locations,
}: {
  staff: StaffRow[];
  locations: LocationOption[];
}) {
  if (staff.length === 0) {
    return (
      <div className="rounded-[var(--rlg)] border border-dashed border-border bg-card px-6 py-12 text-center shadow-[var(--sh-xs)]">
        <p className="text-[13px] text-text-2">
          No staff members for this company yet. Invite them through Clerk and
          they&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {staff.map((s) => (
        <StaffRowItem key={s.id} staff={s} locations={locations} />
      ))}
    </ul>
  );
}

function StaffRowItem({
  staff,
  locations,
}: {
  staff: StaffRow;
  locations: LocationOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const locationLabel =
    staff.locationId
      ? locations.find((l) => l.id === staff.locationId)?.label ?? "—"
      : "No location set";
  const addressSummary = [staff.address, staff.city, staff.state, staff.zip]
    .filter(Boolean)
    .join(", ");

  const initials = staff.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <li className="flex items-start gap-3 rounded-[var(--r)] border border-border bg-surface-2 p-3">
        {staff.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staff.avatarUrl}
            alt={staff.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-pb-navy"
            style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
          >
            {initials || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-text">{staff.name}</div>
          <div className="mt-0.5 text-[12px] text-text-2">{staff.email}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-text-2">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {locationLabel}
            </span>
            {staff.mobile && <span>· {staff.mobile}</span>}
            {addressSummary && <span className="truncate">· {addressSummary}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1 rounded-[var(--r)] border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-text-2 hover:bg-muted-bg"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </li>

      {editOpen && (
        <EditStaffModal
          staff={staff}
          locations={locations}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}

function EditStaffModal({
  staff,
  locations,
  onClose,
}: {
  staff: StaffRow;
  locations: LocationOption[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StaffResult | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", staff.id);
    startTransition(async () => {
      const res = await updateStaffMember(fd);
      setResult(res);
      if (res.ok) setTimeout(onClose, 600);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--rlg)] border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Edit Staff Member</h2>
            <p className="text-[12px] text-text-2">{staff.email}</p>
          </div>
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
          <Field label="Full Name *" name="name" defaultValue={staff.name} required />

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-2">
              Location
            </label>
            <select
              name="locationId"
              defaultValue={staff.locationId ?? "none"}
              className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/20"
            >
              <option value="none">— No location —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            {locations.length === 0 && (
              <p className="mt-1 text-[11px] text-text-2">
                Add offices in <span className="font-semibold">Company Profile</span> first.
              </p>
            )}
          </div>

          <Field label="Address"        name="address"  defaultValue={staff.address  ?? ""} />
          <Field label="Address Line 2" name="address2" defaultValue={staff.address2 ?? ""} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="City"  name="city"  defaultValue={staff.city  ?? ""} />
            <Field label="State" name="state" defaultValue={staff.state ?? ""} />
            <Field label="ZIP"   name="zip"   defaultValue={staff.zip   ?? ""} />
          </div>

          <Field label="Mobile Number" name="mobile" defaultValue={staff.mobile ?? ""} placeholder="(555) 555-5555" />

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
              {pending ? "Saving…" : "Save Changes"}
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
