"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProfile, type ProfileFormState } from "./actions";

const INITIAL: ProfileFormState = { ok: false, message: "" };

type Initial = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function IdentityForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(updateProfile, INITIAL);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial.avatarUrl,
  );
  const [name, setName] = useState(initial.name);

  useEffect(() => {
    if (state.ok) {
      // If the server reset the avatar (cleared), reflect that in preview.
      // Otherwise keep whatever the user selected locally.
    }
  }, [state]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Pick an image file.");
      return;
    }
    if (file.size > 800_000) {
      alert("Image must be under 800KB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setAvatarPreview(dataUrl);
  }

  function handleClearAvatar() {
    setAvatarPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]"
    >
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
          <UserCircle2 className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-text">Identity</h2>
          <p className="mt-0.5 text-[12px] text-text-2">
            How you appear to clients and teammates.
          </p>
        </div>
      </div>

      {/* Hidden input carrying the current avatar data URL (or empty to clear) */}
      <input
        type="hidden"
        name="avatarUrl"
        value={avatarPreview ?? ""}
      />

      <div className="space-y-5 px-6 py-5">
        {/* Avatar row */}
        <div className="flex items-center gap-4">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[18px] font-bold text-white ring-2 ring-border"
              style={{ backgroundColor: "var(--pb-navy)" }}
            >
              {initialsOf(name || initial.email)}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label
              className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-[var(--r)] border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-text shadow-[var(--sh-xs)] transition-colors hover:bg-muted-bg"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {avatarPreview ? "Replace photo" : "Upload photo"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            {avatarPreview && (
              <button
                type="button"
                onClick={handleClearAvatar}
                className="inline-flex w-fit items-center gap-1 text-[11.5px] font-medium text-text-2 transition-colors hover:text-pb-red"
              >
                <Trash2 className="h-3 w-3" />
                Remove photo
              </button>
            )}
            {errors.avatarUrl && (
              <p className="text-[11.5px] text-pb-red">{errors.avatarUrl}</p>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-[12px] font-medium text-text-2">
            Name <span className="text-pb-red">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-[var(--r)] border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 ${
              errors.name
                ? "border-pb-red/50 focus:ring-pb-red/20"
                : "border-border focus:border-pb-navy focus:ring-[rgba(2,29,64,0.15)]"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-[11.5px] text-pb-red">{errors.name}</p>
          )}
        </div>

        {/* Read-only email + role */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyField label="Email" value={initial.email} hint="Managed by your sign-in provider." />
          <ReadOnlyField label="Role" value={initial.role} hint="Changed by an org owner." />
        </div>

        {/* Status line */}
        {state.message && (
          <div
            className={`flex items-start gap-2 rounded-[var(--r)] border px-3 py-2 text-[12.5px] ${
              state.ok
                ? "border-[rgba(34,139,99,0.3)] bg-[rgba(34,139,99,0.06)] text-[rgb(22,101,72)]"
                : "border-pb-red/30 bg-[rgba(219,25,36,0.06)] text-pb-red"
            }`}
          >
            {state.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{state.message}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border bg-muted-bg/30 px-6 py-3.5">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-text-2">
        {label}
      </label>
      <div className="rounded-[var(--r)] border border-dashed border-border bg-muted-bg/40 px-3 py-2 text-[13px] capitalize text-text">
        {value || <span className="text-text-3">—</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-text-3">{hint}</p>}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}
