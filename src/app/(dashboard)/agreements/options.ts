// Shared constants + types + compute helpers for the Agreements feature.
// Lives outside actions.ts so client components can import freely — a
// "use server" file can only export async functions.

export type AgreementStatus =
  | "draft"
  | "sent"
  | "signed"
  | "active"
  | "expired"
  | "cancelled";

export const AGREEMENT_STATUSES: AgreementStatus[] = [
  "draft",
  "sent",
  "signed",
  "active",
  "expired",
  "cancelled",
];

// Legacy Phase-1 type list — still accepted for free-form rows that aren't
// ad contracts (e.g. a service retainer uploaded by hand).
export const AGREEMENT_TYPES = [
  "Advertising",
  "Sponsorship",
  "Service Contract",
  "Retainer",
  "Other",
] as const;

// ── Advertising-contract specific constants ──
export const AD_SIZES = [
  "Full Page",
  "2/3 Page",
  "1/2 Page",
  "1/3 Page",
  "1/4 Page",
  "1/6 Page",
  "1/8 Page",
  "Business Card",
] as const;

export const FREQUENCIES = [
  "1x",
  "3x",
  "6x",
  "9x",
  "12x",
  "Monthly",
  "Quarterly",
  "Custom",
] as const;

export type PaymentMode = "card" | "link" | "invoice" | "check";
export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "card", label: "Charge Card" },
  { value: "link", label: "Payment Link" },
  { value: "invoice", label: "Invoice" },
  { value: "check", label: "Check" },
];

// e-Blast add-on packages — mirrors the hardcoded list in app_holding.js
// `agEmail` (~line 14641). Prices in cents.
export type EblastPackage = {
  id: string;
  name: string;
  priceCents: number;
  features: string[];
};

export const EBLAST_PACKAGES: EblastPackage[] = [
  {
    id: "eb1",
    name: "e-Blast Package No. 1 — $750",
    priceCents: 75000,
    features: [
      "Exclusive e-Blast",
      "One follow-up e-Blast prior to event",
      "Included in Weekly e-Blast (Friday)",
    ],
  },
  {
    id: "eb2",
    name: "e-Blast Package No. 2 — $1,050",
    priceCents: 105000,
    features: [
      "Exclusive e-Blast",
      "Up to two follow-up e-Blasts prior to event",
      "Included in Weekly e-Blast (Friday)",
      "Day of Event Coverage",
      "Up to 4 images on Facebook, Instagram & website",
    ],
  },
];

// Credit-card surcharge rate (3%) applied when paymentMode="card".
export const CARD_SURCHARGE_RATE = 0.03;

// ── Compute helpers ──────────────────────────────────────────

/**
 * Final-month expiration date from a sign date + duration. Mirrors
 * `agComputeExpDate` in app_holding.js: end-of-month on the last month of
 * the ad timing window.
 */
export function computeExpDate(
  signDate: Date | string,
  monthsDuration: number,
): Date {
  const base = typeof signDate === "string" ? new Date(signDate) : new Date(signDate);
  const d = new Date(base);
  d.setMonth(d.getMonth() + monthsDuration);
  // Set to last day of the computed month.
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 0);
  return d;
}

/**
 * Renewal-notice deadline — 30 days before expiration.
 * Mirrors `agRenewalNoticeDate` in app_holding.js.
 */
export function renewalNoticeDate(expDate: Date | string): Date {
  const exp = typeof expDate === "string" ? new Date(expDate) : new Date(expDate);
  const d = new Date(exp);
  d.setDate(d.getDate() - 30);
  return d;
}

/**
 * Rough duration inference from a frequency label. Used when the user
 * picks a frequency but doesn't manually select months.
 */
export function monthsForFrequency(freq: string): number {
  switch (freq) {
    case "1x":
      return 1;
    case "3x":
      return 3;
    case "6x":
      return 6;
    case "9x":
      return 9;
    case "12x":
    case "Monthly":
      return 12;
    case "Quarterly":
      return 12;
    default:
      return 12;
  }
}

/** Adds a 3% surcharge to a cents amount, rounded to the nearest cent. */
export function withCardSurcharge(cents: number): number {
  return Math.round(cents * (1 + CARD_SURCHARGE_RATE));
}
