import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { parsePagination } from "@/components/shared/pagination-helpers";
import { MailingListTable, type MailingRow } from "./mailing-list-table";
import {
  isSortableColumn,
  type MailingSegment,
  type SortableColumn,
} from "./mailing-options";

export type MailingListProps = {
  segment: MailingSegment;
  searchParams: { sort?: string; dir?: string; page?: string; size?: string };
};

const SORT_COL_MAP = {
  firstName: contacts.firstName,
  lastName:  contacts.lastName,
  email:     contacts.email,
  company:   contacts.company,
  city:      contacts.city,
  state:     contacts.state,
  createdAt: contacts.createdAt,
} as const;

export async function MailingList({ segment, searchParams }: MailingListProps) {
  const activeOrg = await getActiveOrg();
  if (!activeOrg) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Pick a company in the sidebar to see this list.
        </p>
      </div>
    );
  }

  const sortParam = searchParams.sort;
  const dirParam = searchParams.dir === "desc" ? "desc" : "asc";
  const sortCol: SortableColumn = isSortableColumn(sortParam)
    ? sortParam
    : "createdAt";
  const sortDir: "asc" | "desc" =
    sortCol === "createdAt" && !sortParam
      ? "desc" // default: newest first
      : dirParam;

  const { page, pageSize, offset } = parsePagination(searchParams);

  const whereClause = and(
    eq(contacts.orgId, activeOrg.id),
    eq(contacts.type, "mailing"),
    sql`${contacts.tags} @> ${JSON.stringify([segment])}::jsonb`,
  );

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id:            contacts.id,
        firstName:     contacts.firstName,
        lastName:      contacts.lastName,
        email:         contacts.email,
        phone:         contacts.phone,
        company:       contacts.company,
        title:         contacts.title,
        licenseNumber: contacts.licenseNumber,
        address:       contacts.address,
        city:          contacts.city,
        state:         contacts.state,
        zip:           contacts.zip,
        website:       contacts.website,
        notes:         contacts.notes,
        createdAt:     contacts.createdAt,
      })
      .from(contacts)
      .where(whereClause)
      .orderBy(
        sortDir === "asc"
          ? asc(SORT_COL_MAP[sortCol])
          : desc(SORT_COL_MAP[sortCol]),
      )
      .limit(pageSize)
      .offset(offset),
    db.select({ c: count() }).from(contacts).where(whereClause),
  ]);

  const total = totalRow[0]?.c ?? 0;

  const clientRows: MailingRow[] = rows.map((r) => ({
    id:            r.id,
    firstName:     r.firstName,
    lastName:      r.lastName,
    email:         r.email,
    phone:         r.phone,
    company:       r.company,
    title:         r.title,
    licenseNumber: r.licenseNumber,
    address:       r.address,
    city:          r.city,
    state:         r.state,
    zip:           r.zip,
    website:       r.website,
    notes:         r.notes,
    createdAt:     r.createdAt.toISOString(),
  }));

  return (
    <MailingListTable
      segment={segment}
      rows={clientRows}
      total={total}
      page={page}
      pageSize={pageSize}
      sortCol={sortCol}
      sortDir={sortDir}
    />
  );
}
