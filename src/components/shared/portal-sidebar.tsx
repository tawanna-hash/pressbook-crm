"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  ListTodo,
  FolderOpen,
  MessageSquare,
  Inbox,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/portal",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/portal/tasks",    label: "Tasks",      icon: ListTodo },
  { href: "/portal/files",    label: "Files",      icon: FolderOpen },
  { href: "/portal/messages", label: "Messages",   icon: MessageSquare },
  { href: "/portal/collect",  label: "Collect Info", icon: Inbox },
  { href: "/portal/settings", label: "Settings",   icon: Settings },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col border-r border-border bg-card"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold text-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--pb-red), var(--pb-plum))",
          }}
        >
          P
        </div>
        <div>
          <div className="font-semibold text-sm text-foreground">
            PressBook 360
          </div>
          <div className="text-xs text-muted">Client Portal</div>
        </div>
      </div>

      {/* Nav Links */}
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
