"use client";

import { useTransition } from "react";
import {
  CheckCircle2,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAgreement, setAgreementStatus } from "./actions";
import { type AgreementStatus } from "./options";
import {
  AgreementModalButton,
  type AgreementEditInitial,
  type ClientOption,
} from "./agreement-modal";

type Row = {
  id: string;
  contactId: string | null;
  clientName: string;
  clientCompany: string | null;
  type: string | null;
  status: AgreementStatus;
  startDate: string | null;
  endDate: string | null;
  amount: number | null; // cents
  notes: string | null;
};

const STATUS_STYLES: Record<
  AgreementStatus,
  { label: string; chip: string; dot: string }
> = {
  draft: {
    label: "Draft",
    chip: "bg-muted-bg-2 text-text-2 ring-1 ring-border",
    dot: "bg-text-3",
  },
  sent: {
    label: "Sent",
    chip: "bg-[rgba(255,199,0,0.12)] text-[color:#8a6900] ring-1 ring-[rgba(255,199,0,0.35)]",
    dot: "bg-[rgb(255,199,0)]",
  },
  signed: {
    label: "Signed",
    chip: "bg-pb-navy/10 text-pb-navy ring-1 ring-pb-navy/25",
    dot: "bg-pb-navy",
  },
  active: {
    label: "Active",
    chip: "bg-[rgba(34,139,99,0.12)] text-[rgb(22,101,72)] ring-1 ring-[rgba(34,139,99,0.3)]",
    dot: "bg-[rgb(34,139,99)]",
  },
  expired: {
    label: "Expired",
    chip: "bg-muted-bg-2 text-text-2 ring-1 ring-border",
    dot: "bg-text-2",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-[rgba(219,25,36,0.08)] text-pb-red ring-1 ring-pb-red/20",
    dot: "bg-pb-red",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function AgreementRow({
  row,
  clients,
}: {
  row: Row;
  clients: ClientOption[];
}) {
  const [pending, start] = useTransition();
  const s = STATUS_STYLES[row.status];

  function changeStatus(next: AgreementStatus) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("status", next);
    start(async () => {
      const res = await setAgreementStatus(fd);
      if (!res.ok) alert(`Couldn't update: ${res.error}`);
    });
  }

  function handleDelete() {
    const ok = window.confirm(
      `Delete this agreement with ${row.clientName}? This can't be undone.`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", row.id);
    start(async () => {
      const res = await deleteAgreement(fd);
      if (!res.ok) alert(`Couldn't delete: ${res.error}`);
    });
  }

  const initial: AgreementEditInitial = {
    id: row.id,
    contactId: row.contactId ?? "",
    type: row.type,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    amount: row.amount,
    notes: row.notes,
  };

  return (
    <li className={`px-5 py-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-text">
              {row.clientName}
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[12px] text-text-2">
            {row.type ?? "Agreement"}
            {row.clientCompany ? ` · ${row.clientCompany}` : ""}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-2">
            <span className="tabular-nums text-text">{formatMoney(row.amount)}</span>
            <span className="text-text-3">·</span>
            <span>
              {formatDate(row.startDate)} – {formatDate(row.endDate)}
            </span>
          </div>
          {row.notes && (
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-text-2">
              {row.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {row.status === "draft" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => changeStatus("sent")}
              leftIcon={<Send className="h-3 w-3" />}
            >
              Send
            </Button>
          )}
          {row.status === "sent" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => changeStatus("active")}
              leftIcon={<CheckCircle2 className="h-3 w-3" />}
            >
              Activate
            </Button>
          )}
          {(row.status === "active" || row.status === "sent") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => changeStatus("cancelled")}
              leftIcon={<XCircle className="h-3 w-3" />}
            >
              Cancel
            </Button>
          )}

          <AgreementModalButton
            mode="edit"
            clients={clients}
            initial={initial}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            aria-label={`Delete agreement with ${row.clientName}`}
            title="Delete"
            className="hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}
