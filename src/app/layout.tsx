import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PressBook 360 CRM",
  description: "CRM for Caxton Publications — RealtyLine & Newsline SA",
};

// Inline script — runs BEFORE React hydration to prevent a flash of the
// wrong theme. Reads from localStorage, falls back to system preference.
// Placed as a plain <script> in <head> per Next.js 16's guidance; using
// next/script with beforeInteractive inside <body> throws a console warning.
const NO_FLASH_SCRIPT = `(function(){try{var s=localStorage.getItem('pb-theme');var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='dark'||s==='light')?s:(d?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <head>
          <script
            id="pb-theme-init"
            dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }}
          />
        </head>
        <body className="antialiased font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
