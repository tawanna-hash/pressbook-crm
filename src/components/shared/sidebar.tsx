"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Users, FileText, Megaphone, MailCheck, Calendar,
  LayoutDashboard, Check, CalendarClock, CalendarDays,
  BookOpen, Clock,
} from "lucide-react";
import { useTransition } from "react";
import { switchOrg } from "@/app/(dashboard)/org-actions";
import { ThemeToggle } from "@/components/shared/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  children?: NavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/",           label: "Dashboard",      icon: LayoutDashboard },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    children: [
      { href: "/agreements",     label: "Agreements", icon: FileText },
      {
        href: "/calendarly",
        label: "Calendarly",
        icon: CalendarClock,
        children: [
          { href: "/team",             label: "Team",            icon: Users },
          { href: "/industry-events",  label: "Industry Events", icon: CalendarDays },
          {
            href: "/booking",
            label: "Booking",
            icon: BookOpen,
            children: [
              { href: "/booking/scheduling", label: "Scheduling", icon: Clock },
            ],
          },
        ],
      },
    ],
  },
  { href: "/campaigns",  label: "Campaign Hub",   icon: Megaphone },
  { href: "/verify",     label: "Verify Emails",  icon: MailCheck },
  { href: "/calendar",   label: "Calendar",       icon: Calendar },
];

type Org = {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
};

type Props = {
  orgs: Org[];
  activeOrgSlug: string;
};

export function Sidebar({ orgs, activeOrgSlug }: Props) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const activeOrg = orgs.find((o) => o.slug === activeOrgSlug) ?? orgs[0];

  function handleSwitch(slug: string) {
    if (slug === activeOrgSlug) return;
    startTransition(async () => {
      await switchOrg(slug);
    });
  }

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col border-r border-border bg-card"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[var(--r)] text-sm font-extrabold text-white"
          style={{ backgroundColor: activeOrg?.brandColor ?? "var(--pb-navy)" }}
        >
          PB
        </div>
        <div>
          <div className="text-sm font-semibold text-text">PressBook 360</div>
          <div className="text-xs text-text-2">Caxton Publications Inc</div>
        </div>
      </div>

      {/* Company switcher */}
      <div className="px-3 py-3">
        <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
          Company
        </div>
        <div
          className={`space-y-1 transition-opacity ${
            pending ? "opacity-50" : "opacity-100"
          }`}
          role="radiogroup"
          aria-label="Switch company"
        >
          {orgs.map((org) => {
            const isActive = org.slug === activeOrgSlug;
            return (
              <button
                key={org.slug}
                type="button"
                onClick={() => handleSwitch(org.slug)}
                disabled={pending}
                role="radio"
                aria-checked={isActive}
                className={`flex w-full items-center gap-2.5 rounded-[var(--r)] px-3 py-2 text-sm transition-colors disabled:cursor-wait ${
                  isActive
                    ? "font-semibold text-white shadow-[var(--sh-xs)]"
                    : "font-medium text-text-2 hover:bg-muted-bg hover:text-text"
                }`}
                style={
                  isActive
                    ? { backgroundColor: org.brandColor }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.85)" : org.brandColor,
                  }}
                />
                <span className="flex-1 truncate text-left">{org.name}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-white/80" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} depth={0} />
        ))}
      </nav>

      {/* (nav rendered above — recursive) */}

      {/* User Button + Theme Toggle */}
      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
              userButtonTrigger: "focus:shadow-none",
            },
          }}
        />
        <ThemeToggle />
      </div>
    </aside>
  );
}

/**
 * Recursive nav link. Each level auto-indents and shows a subtle left-border
 * rule to visually group children with their parent.
 */
function NavLink({
  item,
  pathname,
  depth,
}: {
  item: NavItem;
  pathname: string;
  depth: number;
}) {
  const Icon = item.icon;
  // Exact match for the main highlight; ancestor paths (e.g. /clients while
  // on /clients/123) stay muted so only the most specific item is "on".
  const isActive = pathname === item.href;
  const fontSize = depth === 0 ? "text-[13px]" : "text-[12.5px]";
  const iconSize = depth === 0 ? "h-[18px] w-[18px]" : "h-[14px] w-[14px]";

  return (
    <div>
      <Link
        href={item.href}
        className={`flex items-center gap-${depth === 0 ? "3" : "2.5"} rounded-[var(--r)] px-${depth === 0 ? "3" : "2.5"} py-${depth === 0 ? "2" : "1.5"} ${fontSize} transition-colors ${
          isActive
            ? "bg-muted-bg-2 font-semibold text-pb-navy"
            : "font-medium text-text-2 hover:bg-muted-bg hover:text-text"
        }`}
      >
        <Icon
          className={`${iconSize} ${
            isActive ? "text-pb-navy" : "text-text-2 opacity-70"
          }`}
        />
        {item.label}
      </Link>

      {item.children && item.children.length > 0 && (
        <div className="relative mt-0.5 ml-[22px] space-y-0.5 border-l border-border pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              pathname={pathname}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
