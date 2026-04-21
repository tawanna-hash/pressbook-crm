// Server-safe pagination helpers + types. Imported from both server and
// client modules, so this file must NOT have "use client".

export const PAGE_SIZES = [25, 50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 25;

/**
 * Parse `?page=` and `?size=` from searchParams and return safe values plus
 * the offset to pass to `.limit(...).offset(...)`.
 */
export function parsePagination(searchParams: {
  page?: string;
  size?: string;
}): { page: number; pageSize: PageSize; offset: number } {
  const rawSize = parseInt(searchParams.size ?? "", 10);
  const pageSize: PageSize = (PAGE_SIZES as readonly number[]).includes(rawSize)
    ? (rawSize as PageSize)
    : DEFAULT_PAGE_SIZE;
  const rawPage = parseInt(searchParams.page ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  return { page, pageSize, offset: (page - 1) * pageSize };
}
