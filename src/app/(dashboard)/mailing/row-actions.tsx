"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteMailingContact,
  moveMailingContact,
  updateMailingContact,
  type UpdateMailingResult,
} from "./actions";
import {
  SEGMENTS,
  segmentLabel,
  type MailingSegment,
} from "./mailing-options";

export type EditableContact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  notes: string | null;
};

type Props = {
  contact: EditableContact;
  segment: MailingSegment;
};

type MenuState = "closed" | "open";

export function RowActions({ contact, segment }: Props) {
  const [menu, setMenu] = useState<MenuState>("closed");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menu === "closed") return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenu("closed");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  function handleMove(to: MailingSegment) {
    setMenu("closed");
    startTransition(async () => {
      const res = await moveMailingContact(contact.id, segment, to);
      if (res.ok) {
        setToast({ kind: "ok", msg: `Moved to ${segmentLabel(to)}.` });
      } else {
        setToast({ kind: "err", msg: res.message ?? "Move failed." });
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteMailingContact(contact.id, segment);
      if (res.ok) {
        setToast({ kind: "ok", msg: "Deleted." });
        setConfirmDelete(false);
      } else {
        setToast({ kind: "err", msg: res.message ?? "Delete failed." });
      }
    });
  }

  const otherSegments = SEGMENTS.filter((s) => s.segment !== segment);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setMenu((m) => (m === "open" ? "closed" : "open"))}
        aria-label="Row actions"
        className="flex h-7 w-7 items-center justify-center rounded-[var(--r)] text-text-2 transition-colors hover:bg-muted-bg hover:text-text"
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>

      {menu === "open" && (
        <div className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-[var(--r)] border border-border bg-card shadow-lg">
          <MenuItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="Edit contact"
            onClick={() => {
              setMenu("closed");
              setEditOpen(true);
            }}
          />

          <div className="border-t border-border">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
              Move to list
            </div>
            {otherSegments.map((s) => (
              <MenuItem
                key={s.segment}
                icon={<MoveRight className="h-3.5 w-3.5" />}
                label={s.label}
                onClick={() => handleMove(s.segment)}
              />
            ))}
          </div>

          <div className="border-t border-border">
            <MenuItem
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete"
              tone="danger"
              onClick={() => {
                setMenu("closed");
                setConfirmDelete(true);
              }}
            />
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`absolute right-0 top-full z-50 mt-1 flex items-center gap-1.5 whitespace-nowrap rounded-[var(--r)] px-2.5 py-1.5 text-[11px] font-medium shadow-lg ${
            toast.kind === "ok"
              ? "bg-[rgba(16,185,129,0.12)] text-pb-green"
              : "bg-[rgba(219,25,36,0.12)] text-pb-red"
          }`}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {toast.msg}
        </div>
      )}

      {editOpen && (
        <EditContactModal
          contact={contact}
          segment={segment}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            setToast({ kind: "ok", msg: "Saved." });
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          contact={contact}
          pending={pending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors ${
        tone === "danger"
          ? "text-pb-red hover:bg-[rgba(219,25,36,0.08)]"
          : "text-text hover:bg-muted-bg"
      }`}
    >
      <span className={tone === "danger" ? "text-pb-red" : "text-text-2"}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function EditContactModal({
  contact,
  segment,
  onClose,
  onSaved,
}: {
  contact: EditableContact;
  segment: MailingSegment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<UpdateMailingResult | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", contact.id);
    fd.set("segment", segment);
    startTransition(async () => {
      const res = await updateMailingContact(fd);
      setResult(res);
      if (res.ok) {
        setTimeout(onSaved, 400);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--rlg)] border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Edit Contact</h2>
            <p className="text-[12px] text-text-2">
              {segmentLabel(segment)} — update fields and save.
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First Name *" name="firstName" defaultValue={contact.firstName} required />
            <Field label="Last Name"   name="lastName"   defaultValue={contact.lastName ?? ""} />
            <Field label="Email"       name="email"      defaultValue={contact.email ?? ""} type="email" />
            <Field label="Phone"       name="phone"      defaultValue={contact.phone ?? ""} />
            <Field label="Company"     name="company"    defaultValue={contact.company ?? ""} />
            <Field label="Title"       name="title"      defaultValue={contact.title ?? ""} />
          </div>

          <Field label="Address" name="address" defaultValue={contact.address ?? ""} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="City"  name="city"  defaultValue={contact.city  ?? ""} />
            <Field label="State" name="state" defaultValue={contact.state ?? ""} />
            <Field label="ZIP"   name="zip"   defaultValue={contact.zip   ?? ""} />
          </div>

          <Field label="Website" name="website" defaultValue={contact.website ?? ""} />

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-2">
              Notes
            </label>
            <textarea
              name="notes"
              defaultValue={contact.notes ?? ""}
              rows={3}
              className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/20"
            />
          </div>

          {result && !result.ok && (
            <div className="flex items-center gap-2 rounded-[var(--r)] bg-[rgba(219,25,36,0.08)] px-3 py-2 text-[12.5px] text-pb-red">
              <AlertCircle className="h-3.5 w-3.5" />
              {result.message}
            </div>
          )}
          {result && result.ok && (
            <div className="flex items-center gap-2 rounded-[var(--r)] bg-[rgba(16,185,129,0.08)] px-3 py-2 text-[12.5px] text-pb-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {result.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={pending}
              leftIcon={pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
            >
              {pending ? "Saving…" : "Save Changes"}
            </Button>
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
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  type?: "text" | "email";
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-2">
        {label}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/20"
      />
    </div>
  );
}

function ConfirmDeleteModal({
  contact,
  pending,
  onCancel,
  onConfirm,
}: {
  contact: EditableContact;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[var(--rlg)] border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold text-text">Delete contact?</h2>
          <p className="mt-1 text-[12.5px] text-text-2">
            This removes <span className="font-semibold text-text">{name || "this contact"}</span>{" "}
            permanently. This action can&apos;t be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
            leftIcon={
              pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )
            }
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
