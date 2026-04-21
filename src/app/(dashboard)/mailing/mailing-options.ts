// Shared constants & helpers for Mailing List Hub. Plain module so it can
// be imported from server and client files alike.

export type MailingSegment = "advertiser" | "non-advertiser" | "realtor";

export const SEGMENTS: { slug: string; segment: MailingSegment; label: string }[] = [
  { slug: "advertisers",     segment: "advertiser",     label: "Advertisers" },
  { slug: "non-advertisers", segment: "non-advertiser", label: "Non-Advertisers" },
  { slug: "realtors",        segment: "realtor",        label: "REALTORS" },
];

export function segmentToSlug(segment: MailingSegment): string {
  if (segment === "advertiser") return "advertisers";
  if (segment === "non-advertiser") return "non-advertisers";
  return "realtors";
}

export function segmentLabel(segment: MailingSegment): string {
  return SEGMENTS.find((s) => s.segment === segment)?.label ?? segment;
}

export const SORTABLE_COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "company",
  "city",
  "state",
  "createdAt",
] as const;

export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export function isSortableColumn(v: unknown): v is SortableColumn {
  return (
    typeof v === "string" &&
    (SORTABLE_COLUMNS as readonly string[]).includes(v)
  );
}
