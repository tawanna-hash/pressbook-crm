// Shared option lists for client forms. Kept in a plain module (not a
// "use server" file) so both server and client components can import these
// runtime constants safely.

export const STATUS_OPTIONS = ["active", "prospect", "inactive"] as const;
export type ClientStatus = (typeof STATUS_OPTIONS)[number];

export const INDUSTRY_OPTIONS = [
  "Real Estate",
  "Homebuilder",
  "Developer",
  "Mortgage",
  "Insurance",
  "Title",
  "Property Management",
  "Finance",
  "Construction",
  "Home Services",
  "Other",
] as const;
