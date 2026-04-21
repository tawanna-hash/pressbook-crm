"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { updateCompanyProfile, type CompanyProfileResult } from "./actions";

type Org = {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  websiteUrl: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  about: string | null;
};

export function CompanyProfileForm({ org }: { org: Org }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logoUrl);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CompanyProfileResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) {
      setResult({ ok: false, message: "Logo must be under 1 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(f);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (logoUrl) fd.set("logoUrl", logoUrl);
    else fd.set("logoUrl", "");
    startTransition(async () => {
      const res = await updateCompanyProfile(fd);
      setResult(res);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Logo */}
      <div className="flex items-center gap-4 rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r)] border border-border bg-muted-bg">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-text-2" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-text">Company logo</div>
          <div className="text-[12px] text-text-2">
            Shown in the client portal header. PNG, JPG, or SVG up to 1 MB.
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="block text-[12px] text-text file:mr-2 file:rounded-[var(--r)] file:border-0 file:bg-pb-navy file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white hover:file:opacity-90"
            />
            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  setLogoUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-[12px] font-medium text-pb-red hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
        <h2 className="mb-3 text-[14px] font-semibold text-text">Contact</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Phone"   name="phone"      defaultValue={org.phone ?? ""} placeholder="(555) 555-5555" />
          <Field label="Website" name="websiteUrl" defaultValue={org.websiteUrl ?? ""} placeholder="https://example.com" />
        </div>
      </div>

      {/* Address */}
      <div className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
        <h2 className="mb-3 text-[14px] font-semibold text-text">Office address</h2>
        <div className="space-y-3">
          <Field label="Street"  name="address"  defaultValue={org.address ?? ""} />
          <Field label="Suite / Apt" name="address2" defaultValue={org.address2 ?? ""} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="City"  name="city"  defaultValue={org.city  ?? ""} />
            <Field label="State" name="state" defaultValue={org.state ?? ""} />
            <Field label="ZIP"   name="zip"   defaultValue={org.zip   ?? ""} />
          </div>
        </div>
      </div>

      {/* About */}
      <div className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
        <h2 className="mb-3 text-[14px] font-semibold text-text">About</h2>
        <textarea
          name="about"
          defaultValue={org.about ?? ""}
          rows={5}
          placeholder={`Brief description of ${org.name} that clients will see on the portal.`}
          className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/15"
        />
      </div>

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

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-[var(--r)] bg-pb-navy px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
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
        className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/15"
      />
    </div>
  );
}
