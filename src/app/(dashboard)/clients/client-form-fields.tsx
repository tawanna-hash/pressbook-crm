"use client";

import { useState } from "react";
import { type AdditionalContact } from "@/lib/db/schema";
import { type ClientFormFieldErrors } from "./actions";
import { INDUSTRY_OPTIONS, STATUS_OPTIONS } from "./client-options";
import { AvatarUpload } from "./avatar-upload";

export type ClientInitialValues = {
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  portalEmail?: string | null;
  phone?: string | null;
  officePhone?: string | null;
  company?: string | null;
  title?: string | null;
  website?: string | null;
  industry?: string | null;
  status?: string | null;
  licenseNumber?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
  additionalContacts?: AdditionalContact[] | null;
};

function fieldClasses(hasError?: boolean) {
  const base =
    "w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2";
  return hasError
    ? `${base} border-red-400 focus:border-red-500 focus:ring-red-200`
    : `${base} border-gray-300 focus:border-pb-navy focus:ring-pb-navy/20`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 mt-2 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
      {children}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-pb-red"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-pb-red">{error}</p>}
    </div>
  );
}

type Props = {
  initial?: ClientInitialValues;
  errors?: ClientFormFieldErrors;
};

const STATUS_LABEL: Record<(typeof STATUS_OPTIONS)[number], string> = {
  active: "Active",
  prospect: "Prospect",
  inactive: "Inactive",
};

export function ClientFormFields({ initial = {}, errors = {} }: Props) {
  const addl = initial.additionalContacts ?? [];
  const initialStatus = initial.status ?? "prospect";
  // Track first/last name live so the initials fallback updates as the user types.
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");

  return (
    <div className="space-y-2">
      {/* ── Primary Contact Info ────────────────────────────── */}
      <SectionHeader>Primary Contact Info</SectionHeader>

      <div className="space-y-4">
        <AvatarUpload
          initialUrl={initial.avatarUrl ?? undefined}
          firstName={firstName}
          lastName={lastName}
        />

        <Field label="Company name" htmlFor="company">
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            placeholder="Company name"
            defaultValue={initial.company ?? ""}
            className={fieldClasses(false)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            htmlFor="firstName"
            required
            error={errors.firstName}
          >
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              placeholder="First"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={fieldClasses(Boolean(errors.firstName))}
            />
          </Field>
          <Field label="Last name" htmlFor="lastName">
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={fieldClasses(false)}
            />
          </Field>
        </div>

        <Field label="Title" htmlFor="title">
          <input
            id="title"
            name="title"
            type="text"
            autoComplete="organization-title"
            placeholder="Owner, Broker, VP of Sales…"
            defaultValue={initial.title ?? ""}
            className={fieldClasses(false)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Email"
            htmlFor="email"
            required
            error={errors.email}
          >
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="email@company.com"
              defaultValue={initial.email ?? ""}
              className={fieldClasses(Boolean(errors.email))}
            />
          </Field>
          <Field
            label="Client Portal Email"
            htmlFor="portalEmail"
            hint="Used for client portal login. Defaults to the email above if blank."
            error={errors.portalEmail}
          >
            <input
              id="portalEmail"
              name="portalEmail"
              type="email"
              autoComplete="email"
              placeholder="portal@example.com"
              defaultValue={initial.portalEmail ?? ""}
              className={fieldClasses(Boolean(errors.portalEmail))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mobile" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="000-000-0000"
              defaultValue={initial.phone ?? ""}
              className={fieldClasses(false)}
            />
          </Field>
          <Field label="Office Phone" htmlFor="officePhone">
            <input
              id="officePhone"
              name="officePhone"
              type="tel"
              autoComplete="tel"
              placeholder="000-000-0000"
              defaultValue={initial.officePhone ?? ""}
              className={fieldClasses(false)}
            />
          </Field>
        </div>

        <Field label="Website" htmlFor="website">
          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://example.com"
            defaultValue={initial.website ?? ""}
            className={fieldClasses(false)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Industry" htmlFor="industry">
            <select
              id="industry"
              name="industry"
              defaultValue={initial.industry ?? ""}
              className={fieldClasses(false)}
            >
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={initialStatus}
              className={fieldClasses(false)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {STATUS_LABEL[opt]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="License #" htmlFor="licenseNumber">
          <input
            id="licenseNumber"
            name="licenseNumber"
            type="text"
            placeholder="License number"
            defaultValue={initial.licenseNumber ?? ""}
            className={fieldClasses(false)}
          />
        </Field>
      </div>

      {/* ── Mailing Address ─────────────────────────────────── */}
      <SectionHeader>Mailing Address</SectionHeader>

      <div className="space-y-4">
        <Field label="Mailing Address" htmlFor="address">
          <input
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
            placeholder="Street address"
            defaultValue={initial.address ?? ""}
            className={fieldClasses(false)}
          />
        </Field>
        <Field label="Address 2" htmlFor="address2">
          <input
            id="address2"
            name="address2"
            type="text"
            placeholder="Suite, Apt, Unit, etc."
            defaultValue={initial.address2 ?? ""}
            className={fieldClasses(false)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="city">
            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              placeholder="City"
              defaultValue={initial.city ?? ""}
              className={fieldClasses(false)}
            />
          </Field>
          <Field label="State" htmlFor="state">
            <input
              id="state"
              name="state"
              type="text"
              autoComplete="address-level1"
              placeholder="TX"
              defaultValue={initial.state ?? ""}
              className={fieldClasses(false)}
            />
          </Field>
          <Field label="ZIP" htmlFor="zip">
            <input
              id="zip"
              name="zip"
              type="text"
              autoComplete="postal-code"
              placeholder="00000"
              defaultValue={initial.zip ?? ""}
              className={fieldClasses(false)}
            />
          </Field>
        </div>
      </div>

      {/* ── Additional Contact 2 ───────────────────────────── */}
      <SectionHeader>Additional Contact 2</SectionHeader>
      <AdditionalContactBlock idx={0} initial={addl[0]} />

      {/* ── Additional Contact 3 ───────────────────────────── */}
      <SectionHeader>Additional Contact 3</SectionHeader>
      <AdditionalContactBlock idx={1} initial={addl[1]} />

      {/* ── Notes ──────────────────────────────────────────── */}
      <SectionHeader>Notes</SectionHeader>
      <Field label="Notes" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Add any notes about this client…"
          defaultValue={initial.notes ?? ""}
          className={fieldClasses(false)}
        />
      </Field>
    </div>
  );
}

function AdditionalContactBlock({
  idx,
  initial,
}: {
  idx: number;
  initial?: AdditionalContact;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First Name" htmlFor={`addl-${idx}-firstName`}>
          <input
            id={`addl-${idx}-firstName`}
            name={`addl[${idx}].firstName`}
            type="text"
            placeholder="First name"
            defaultValue={initial?.firstName ?? ""}
            className={fieldClasses(false)}
          />
        </Field>
        <Field label="Last Name" htmlFor={`addl-${idx}-lastName`}>
          <input
            id={`addl-${idx}-lastName`}
            name={`addl[${idx}].lastName`}
            type="text"
            placeholder="Last name"
            defaultValue={initial?.lastName ?? ""}
            className={fieldClasses(false)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor={`addl-${idx}-email`}>
          <input
            id={`addl-${idx}-email`}
            name={`addl[${idx}].email`}
            type="email"
            placeholder={`contact${idx + 2}@example.com`}
            defaultValue={initial?.email ?? ""}
            className={fieldClasses(false)}
          />
        </Field>
        <Field label="Title" htmlFor={`addl-${idx}-title`}>
          <input
            id={`addl-${idx}-title`}
            name={`addl[${idx}].title`}
            type="text"
            placeholder="VP of Sales"
            defaultValue={initial?.title ?? ""}
            className={fieldClasses(false)}
          />
        </Field>
      </div>
      <Field label="Contact Number" htmlFor={`addl-${idx}-phone`}>
        <input
          id={`addl-${idx}-phone`}
          name={`addl[${idx}].phone`}
          type="tel"
          placeholder="000-000-0000"
          defaultValue={initial?.phone ?? ""}
          className={fieldClasses(false)}
        />
      </Field>
    </div>
  );
}
