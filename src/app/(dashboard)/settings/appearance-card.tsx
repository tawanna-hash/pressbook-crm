"use client";

import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem("pb-theme", theme);
  } catch {
    /* storage denied — session-only */
  }
}

function readInitial(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem("pb-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  const current = document.documentElement.getAttribute("data-theme");
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
