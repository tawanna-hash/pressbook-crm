import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "PressBook 360 CRM",
  description: "CRM for Caxton Publications — RealtyLine & Newsline SA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
