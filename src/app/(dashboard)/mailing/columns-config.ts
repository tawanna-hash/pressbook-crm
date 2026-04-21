// Canonical column + field definitions for the Mailing List tables and
// import-mapping UI. Kept as a plain module so both server and client
// components can import from it.

export type ColumnId =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "company"
  | "title"
  | "licenseNumber"
  | "address"
  | "city"
  | "state"
  | "zip"
  | "website"
  | "notes"
  | "createdAt";

export type ColumnConfig = {
  id: ColumnId;
  label: string;
  sortable: boolean;
  defaultVisible: boolean;
};

export const COLUMNS: ColumnConfig[] = [
  { id: "firstName",     label: "First Name",    sortable: true,  defaultVisible: true  },
  { id: "lastName",      label: "Last Name",     sortable: true,  defaultVisible: true  },
  { id: "email",         label: "Email",         sortable: true,  defaultVisible: true  },
  { id: "phone",         label: "Phone",         sortable: false, defaultVisible: true  },
  { id: "company",       label: "Company",       sortable: true,  defaultVisible: true  },
  { id: "title",         label: "Title",         sortable: false, defaultVisible: false },
  { id: "licenseNumber", label: "License #",     sortable: false, defaultVisible: false },
  { id: "address",       label: "Address",       sortable: false, defaultVisible: false },
  { id: "city",          label: "City",          sortable: true,  defaultVisible: true  },
  { id: "state",         label: "State",         sortable: true,  defaultVisible: true  },
  { id: "zip",           label: "ZIP",           sortable: false, defaultVisible: false },
  { id: "website",       label: "Website",       sortable: false, defaultVisible: false },
  { id: "notes",         label: "Notes",         sortable: false, defaultVisible: false },
  { id: "createdAt",     label: "Added",         sortable: true,  defaultVisible: true  },
];

export const DEFAULT_COLUMN_ORDER: ColumnId[] = COLUMNS.map((c) => c.id);

export const DEFAULT_VISIBLE_COLUMNS: ColumnId[] =
  COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);

// ── Import mapping ────────────────────────────────────────────
// Canonical fields the user can map file columns to. "fullName" is an
// import-only helper that gets split into firstName + lastName. "skip"
// means ignore that column.

export type CanonicalImportField =
  | "skip"
  | "fullName"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "company"
  | "title"
  | "licenseNumber"
  | "address"
  | "city"
  | "state"
  | "zip"
  | "website"
  | "notes";

export const IMPORT_FIELDS: { id: CanonicalImportField; label: string }[] = [
  { id: "skip",          label: "— Skip this column —" },
  { id: "fullName",      label: "Full Name (auto-split)" },
  { id: "firstName",     label: "First Name" },
  { id: "lastName",      label: "Last Name" },
  { id: "email",         label: "Email" },
  { id: "phone",         label: "Phone" },
  { id: "company",       label: "Company" },
  { id: "title",         label: "Title" },
  { id: "licenseNumber", label: "License #" },
  { id: "address",       label: "Address" },
  { id: "city",          label: "City" },
  { id: "state",         label: "State" },
  { id: "zip",           label: "ZIP" },
  { id: "website",       label: "Website" },
  { id: "notes",         label: "Notes" },
];

/**
 * Heuristic auto-mapping: given a file header, return our best guess at the
 * canonical field. The mapping UI shows this as the preselected value but
 * the user can override.
 */
export function guessField(header: string): CanonicalImportField {
  const h = header.trim().toLowerCase().replace(/[_\s-]+/g, " ");
  const table: Record<string, CanonicalImportField> = {
    "first name": "firstName", "firstname": "firstName", "fname": "firstName",
    "given name": "firstName",
    "last name": "lastName", "lastname": "lastName", "lname": "lastName",
    "surname": "lastName", "family name": "lastName",
    "full name": "fullName", "name": "fullName",
    "email": "email", "email address": "email", "e mail": "email",
    "phone": "phone", "phone number": "phone", "mobile": "phone", "cell": "phone",
    "company": "company", "organization": "company", "business": "company",
    "employer": "company",
    "title": "title", "job title": "title", "position": "title", "role": "title",
    "license": "licenseNumber", "license number": "licenseNumber",
    "license no": "licenseNumber", "license #": "licenseNumber",
    "lic": "licenseNumber", "lic #": "licenseNumber", "lic no": "licenseNumber",
    "address": "address", "street": "address", "street address": "address",
    "city": "city",
    "state": "state", "province": "state",
    "zip": "zip", "zipcode": "zip", "zip code": "zip",
    "postal code": "zip", "postcode": "zip",
    "website": "website", "url": "website", "site": "website",
    "notes": "notes", "note": "notes", "comment": "notes",
  };
  return table[h] ?? "skip";
}

/** Split "John Q. Public" into firstName + lastName, preferring first token for first. */
export function splitFullName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, idx),
    lastName:  trimmed.slice(idx + 1),
  };
}
