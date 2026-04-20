import { currentUser } from "@clerk/nextjs/server";
import {
  AlertCircle,
  FolderOpen,
  Inbox,
  ListTodo,
  MessageSquare,
} from "lucide-react";
import { resolveCurrentContact } from "@/lib/auth/contact";

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
  const user = await currentUser();
  const resolution = await resolveCurrentContact();
  const greeting = greetingFor(new Date());

  // If this Clerk user doesn't have a matching CRM contact yet, show a
  // pending-activation screen instead of the dashboard. Staff needs to
  // add them as a contact with a matching email first.
  if (resolution.status === "not_found") {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(245, 158, 11, 0.12)" }}
          >
            <AlertCircle className="h-6 w-6 text-pb-amber" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Your portal isn&rsquo;t activated yet
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            We don&rsquo;t have a client record matching{" "}
            {resolution.email ? (
              <span className="font-medium text-foreground">
                {resolution.email}
              </span>
            ) : (
              "your email"
            )}{" "}
            yet. Please reach out to your PressBook 360 account team so they
            can add you to the CRM. Once they do, refresh this page and
            you&rsquo;ll be in.
          </p>
          <p className="text-xs text-muted">
            If you think this is a mistake, make sure you signed up with the
            email your team uses for you.
          </p>
        </div>
      </div>
    );
  }

  // At this point: status === "linked"
  const contact = resolution.status === "linked" ? resolution.contact : null;
  const greetingName =
    contact?.firstName || user?.firstName || "there";
  const activatedToday =
    contact?.portalActivatedAt &&
    new Date(contact.portalActivatedAt).toDateString() ===
      new Date().toDateString();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">
          {greeting}, {greetingName}!
        </h1>
        <p className="mt-1 text-sm text-muted">
          {activatedToday
            ? "Welcome to your portal — you&rsquo;re all set up."
            : "Here's what's happening with your projects today."}
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
                <div className="text-2xl font-bold text-foreground">
                  {card.value}
                </div>
                <div className="text-xs text-muted">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {contact && (
        <div className="max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Your account
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Name
              </dt>
              <dd className="mt-1 text-foreground">
                {[contact.firstName, contact.lastName]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Email
              </dt>
              <dd className="mt-1 text-foreground">{contact.email || "—"}</dd>
            </div>
            {contact.company && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Company
                </dt>
                <dd className="mt-1 text-foreground">{contact.company}</dd>
              </div>
            )}
            {contact.phone && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Phone
                </dt>
                <dd className="mt-1 text-foreground">{contact.phone}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
