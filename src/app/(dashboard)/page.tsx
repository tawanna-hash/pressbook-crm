import { Users, FileText, Megaphone, MailCheck } from "lucide-react";

const STAT_CARDS = [
  { label: "Contacts",    value: "—", icon: Users,     color: "#021D40" },
  { label: "Agreements",  value: "—", icon: FileText,  color: "#10B981" },
  { label: "Campaigns",   value: "—", icon: Megaphone, color: "#3D0740" },
  { label: "Verified",    value: "—", icon: MailCheck,  color: "#F59E0B" },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">
          Welcome to PressBook 360 — your CRM is getting a fresh start.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 shadow-sm"
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.color + "12" }}
              >
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <div className="text-xs text-muted">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase 0 Status */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm max-w-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-3">Phase 0 Complete</h2>
        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs">✓</span>
            Next.js 15 + TypeScript + Tailwind
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs">✓</span>
            Clerk authentication with org switcher
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs">✓</span>
            Drizzle ORM + PostgreSQL schema (15 tables)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs">✓</span>
            Dashboard layout with sidebar navigation
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center text-white text-xs">→</span>
            <span className="font-medium">Next up:</span> Phase 1 — Contacts + Agreements
          </li>
        </ul>
      </div>
    </div>
  );
}
