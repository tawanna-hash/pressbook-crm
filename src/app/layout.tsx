import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inline script — runs BEFORE React hydration to prevent a flash of the
  // wrong theme. Reads from localStorage; falls back to system preference.
  const noFlashScript = `
(function() {
  try {
    var stored = localStorage.getItem('pb-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
  `.trim();

  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <body className="antialiased font-sans">
          <Script id="pb-theme-init" strategy="beforeInteractive">
            {noFlashScript}
          </Script>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
