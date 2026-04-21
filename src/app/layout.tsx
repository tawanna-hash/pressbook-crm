import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
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

/**
 * Theme is stored in a cookie (`pb-theme`) and read server-side so the
 * correct `data-theme` is present on the first HTML byte — no inline
 * script needed, no flash of the wrong theme. First-time visitors with
 * no cookie default to light; they can toggle in the UI, which writes
 * the cookie via document.cookie and then flips `data-theme` on the
 * live document.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("pb-theme")?.value;
  const theme: "light" | "dark" =
    cookieTheme === "dark" ? "dark" : "light";

  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme={theme}
        className={inter.variable}
        suppressHydrationWarning
      >
        <body className="antialiased font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
