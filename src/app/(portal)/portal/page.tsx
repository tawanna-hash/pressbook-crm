import { redirect } from "next/navigation";
import {
  FolderOpen,
  Inbox,
  KeyRound,
  ListTodo,
  Mail,
  MessageSquare,
} from "lucide-react";
import { getPortalContext } from "@/lib/auth/portal-context";

const STAT_CARDS = [
  { label: "Open Tasks",      value: "—", icon: ListTodo,      color: "#021D40" },
  { label: "Shared Files",    value: "—", icon: FolderOpen,    color: "#10B981" },
  { label: "Unread Messages", value: "—", icon: MessageSquare, color: "#3D0740" },
  { label: "Info Requested",  value: "—", icon: Inbox,         color: "#F59E0B" },
];

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function PortalDashboardPage() {
  const ctx = await getPortalContext();

  // No valid portal session and not staff — the visitor needs a fresh
  // magic link from their agency. We don't render the CRM here;
  // clients should arrive via an email link.
  if (ctx.role === "unauthenticated" || ctx.role === "unknown") {
    return (
      <div className="mt-8 rounded-[var(--rlg)] border border-border bg-card p-8 shadow-[var(--sh-xs)]">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(2,29,64,0.08)]">
          <Mail className="h-5 w-5 text-pb-navy" />
        </div>
        <h1 className="mb-1 text-2xl font-bold text-text">Check your inbox</h1>
        <p className="text-[13.5px] leading-relaxed text-text-2">
          Your client portal opens through a one-time link from your agency
          — there&rsquo;s no password to remember. If you don&rsquo;t see a
          recent email from us, reply to your most recent message and ask
          for a fresh link. It lands in your inbox in seconds.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[12px] text-text-3">
          <KeyRound className="h-3.5 w-3.5" />
          Each link works once. Close the browser tab and you&rsquo;ll need
          a new link to return.
        </div>
      </div>
    );
  }

  // First-run onboarding: real (non-impersonated) clients who haven't
  // finished the welcome screen go through it before seeing the
  // dashboard. Staff preview and impersonation skip this — it's a
  // client-only experience.
  if (
    ctx.role === "client" &&
    !ctx.impersonation &&
    !ctx.contact.portalOnboardedAt
  ) {
    redirect("/portal/welcome");
  }

  // At this point ctx is "client" (real or impersonated) or "staff".
  const greeting = greetingFor(new Date());
  const contact =
    ctx.role === "client" ? ctx.contact : null;
  const greetingName = contact?.firstName || "there";
  const isImpersonating = ctx.role === "client" && Boolean(ctx.impersonation);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-text">
          {greeting}, {greetingName}!
        </h1>
        <p className="mt-1 text-sm text-text-2">
          {isImpersonating
            ? "Staff view — showing this client's portal dashboard."
            : "Here's what's happening with your account today."}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ backgroundColor: card.color + "12" }}
              >
                <Icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{card.value}</div>
                <div className="text-xs text-text-2">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {contact && (
        <div className="max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-text">Your account</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-2">
                Name
              </dt>
              <dd className="mt-1 text-text">
                {[contact.firstName, contact.lastName]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-2">
                Email
              </dt>
              <dd className="mt-1 text-text">{contact.email || "—"}</dd>
            </div>
            {contact.company && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-text-2">
                  Company
                </dt>
                <dd className="mt-1 text-text">{contact.company}</dd>
              </div>
            )}
            {contact.phone && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-text-2">
                  Phone
                </dt>
                <dd className="mt-1 text-text">{contact.phone}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
