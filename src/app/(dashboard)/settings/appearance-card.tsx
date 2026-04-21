"use client";

import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = name + "=";
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    if (c.startsWith(target)) return decodeURIComponent(c.slice(target.length));
  }
  return null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  writeCookie("pb-theme", theme);
}

function readInitial(): Theme {
  const stored = readCookie("pb-theme");
  if (stored === "dark" || stored === "light") return stored;
  const current =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme")
      : null;
  return current === "dark" ? "dark" : "light";
}

export function AppearanceCard() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readInitial());
    setMounted(true);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
          <Palette className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-text">Appearance</h2>
          <p className="mt-0.5 text-[12px] text-text-2">
            Pick a theme. Stored on this device.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-6 py-5 sm:max-w-md">
        <ThemeChoice
          active={mounted && theme === "light"}
          onClick={() => choose("light")}
          icon={<Sun className="h-4 w-4" />}
          label="Light"
        />
        <ThemeChoice
          active={mounted && theme === "dark"}
          onClick={() => choose("dark")}
          icon={<Moon className="h-4 w-4" />}
          label="Dark"
        />
      </div>
    </div>
  );
}

function ThemeChoice({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-[var(--r)] border px-3 py-4 text-[13px] font-medium transition-colors ${
        active
          ? "border-pb-navy bg-pb-navy/5 text-pb-navy ring-2 ring-[rgba(2,29,64,0.15)]"
          : "border-border bg-card text-text-2 hover:bg-muted-bg"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
