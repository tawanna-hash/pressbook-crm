"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

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
  // 1-year expiry, scoped to whole site, SameSite=Lax so it's sent on
  // normal navigations. Not HttpOnly on purpose — we read it from JS
  // here too.
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

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readInitial());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-muted-bg hover:text-text"
      suppressHydrationWarning
    >
      {mounted ? <Icon className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
