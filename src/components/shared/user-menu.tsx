"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Settings, UserCircle2 } from "lucide-react";

type Props = {
  name: string;
  email: string;
  avatarUrl: string | null;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Compact user menu for the top-right of the dashboard header.
 * Click the avatar → dropdown with Profile and Settings links.
 */
export function UserMenu({ name, email, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-2 shadow-[var(--sh-xs)] transition-colors hover:bg-muted-bg"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
            style={{ backgroundColor: "var(--pb-navy)" }}
          >
            {initialsOf(name || email)}
          </div>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-text-2 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-[var(--r)] border border-border bg-card shadow-[var(--sh-lg)] ring-1 ring-black/5"
        >
          <div className="border-b border-border bg-muted-bg/40 px-3.5 py-2.5">
            <div className="truncate text-[12.5px] font-semibold text-text">
              {name}
            </div>
            <div className="truncate text-[11.5px] text-text-2">{email}</div>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-muted-bg"
          >
            <UserCircle2 className="h-3.5 w-3.5 text-text-2" />
            Profile
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-muted-bg"
          >
            <Settings className="h-3.5 w-3.5 text-text-2" />
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
