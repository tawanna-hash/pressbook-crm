"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Users, FileText, Megaphone, MailCheck, Calendar,
  Settings, LayoutDashboard, ChevronDown
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/",           label: "Dashboard",      icon: LayoutDashboard },
  { href: "/contacts",   label: "Contacts",       icon: Users },
  { href: "/agreements",  label: "Agreements",     icon: FileText },
  { href: "/campaigns",  label: "Campaign Hub",   icon: Megaphone },
  { href: "/verify",     label: "Verify Emails",  icon: MailCheck },
  { href: "/calendar",   label: "Calendar",       icon: Calendar },
  { href: "/settings",   label: "Settings",       icon: Settings },
];

const ORGS = [
  { slug: "rl", name: "RealtyLine",  color: "#021D40" },
  { slug: "nl", name: "Newsline SA", color: "#3D0740" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [orgSlug, setOrgSlug] = useState("rl");
  const [orgOpen, setOrgOpen] = useState(false);
  const currentOrg = ORGS.find((o) => o.slug === orgSlug) || ORGS[0];

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col border-r border-border bg-card"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: currentOrg.color }}
        >
          PB
        </div>
        <div>
          <div className="font-semibold text-sm text-foreground">PressBook 360</div>
          <div className="text-xs text-muted">CRM Platform</div>
        </div>
      </div>

      {/* Org Switcher */}
      <div className="px-3 py-3">
        <button
          onClick={() => setOrgOpen(!orgOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-[#F3F4F6] transition-colors"
        >
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentOrg.color }}
            />
            {currentOrg.name}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted transition-transform ${orgOpen ? "rotate-180" : ""}`} />
        </button>
        {orgOpen && (
          <div className="mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {ORGS.map((org) => (
              <button
                key={org.slug}
                onClick={() => { setOrgSlug(org.slug); setOrgOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#F3F4F6] transition-colors ${
                  org.slug === orgSlug ? "bg-[#F3F4F6] font-medium" : ""
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: org.color }}
                />
                {org.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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
