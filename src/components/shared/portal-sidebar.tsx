"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Building2,
  CreditCard,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/portal",          label: "Dashboard",    icon: LayoutDashboard },
  { href: "/portal/info",     label: "Location",     icon: Building2 },
  { href: "/portal/team",     label: "Staff",        icon: Users },
  { href: "/portal/billing",  label: "Billing",      icon: CreditCard },
  { href: "/portal/files",    label: "Files",        icon: FolderOpen },
  { href: "/portal/tasks",    label: "Tasks",        icon: ListTodo },
  { href: "/portal/messages", label: "Messages",     icon: MessageSquare },
  { href: "/portal/collect",  label: "Collect Info", icon: Inbox },
  { href: "/portal/settings", label: "Settings",     icon: Settings },
];

type Org = {
  name: string;
  brandColor: string;
  logoUrl: string | null;
};

export function PortalSidebar({
  org,
  role,
}: {
  org: Org;
  role: "client" | "staff";
}) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col border-r border-border bg-card"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Agency brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logoUrl}
            alt={org.name}
            className="h-10 w-10 shrink-0 rounded-[var(--r)] object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center text-white font-extrabold text-sm"
            style={{ backgroundColor: org.brandColor }}
          >
            {org.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm text-foreground">
            {org.name}
          </div>
          <div className="text-xs text-muted">
            {role === "client" ? "Client Portal" : "Staff Preview"}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/portal" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-[#F3F4F6]"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Staff escape hatch */}
      {role === "staff" && (
        <div className="border-t border-border px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[var(--r)] px-3 py-2 text-[12px] font-medium text-muted hover:bg-[#F3F4F6]"
          >
            ← Back to Dashboard
          </Link>
        </div>
      )}

      {/* User Button */}
      <div className="px-5 py-4 border-t border-border">
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </aside>
  );
}
