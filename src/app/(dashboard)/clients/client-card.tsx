import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: "Active",   color: "#10B981" },
  prospect: { label: "Prospect", color: "#F59E0B" },
  inactive: { label: "Inactive", color: "#6B7280" },
};

export type ClientCardData = {
  id: string;
  avatarUrl: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  clerkId: string | null;
};

function initialsOf(first: string, last: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  const out = (a + b).toUpperCase();
  return out || "—";
}

export function ClientCard({ client }: { client: ClientCardData }) {
  const name =
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    "(no name)";
  const initials = initialsOf(client.firstName, client.lastName);
  const activated = Boolean(client.clerkId);
  const statusMeta =
    STATUS_BADGE[client.status ?? "prospect"] ?? STATUS_BADGE.prospect;

  const location = [client.city, client.state].filter(Boolean).join(", ");

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-pb-navy/40 hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        {client.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={client.avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-semibold text-pb-navy"
            style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-foreground">
            {name}
          </div>
          {client.title && (
            <div className="truncate text-xs text-muted">{client.title}</div>
          )}
        </div>
      </div>

      {/* Company */}
      {client.company && (
        <div className="mb-3 truncate text-sm font-medium text-foreground">
          {client.company}
        </div>
      )}

      {/* Contact facts */}
      <div className="mb-4 space-y-1.5 text-xs">
        {client.email && (
          <div className="flex items-center gap-2 text-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-muted">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{client.phone}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-2 text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: statusMeta.color + "14",
            color: statusMeta.color,
          }}
        >
          {statusMeta.label}
        </span>
        {activated ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-pb-green">
            <CheckCircle2 className="h-3 w-3" />
            Portal
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <Circle className="h-3 w-3" />
            Pending
          </span>
        )}
      </div>
    </Link>
  );
}
