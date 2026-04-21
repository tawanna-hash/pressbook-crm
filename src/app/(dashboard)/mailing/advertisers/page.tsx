import { MailingList } from "../mailing-list";
import { AutoRefresh } from "@/components/shared/auto-refresh";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ sort?: string; dir?: string; page?: string; size?: string }>;

export default async function AdvertisersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <>
      {/* Cron refreshes the DB every minute; this pulls fresh rows into
          the page so the user doesn't need to manually reload. */}
      <AutoRefresh intervalMs={60_000} />
      <MailingList segment="advertiser" searchParams={sp} />
    </>
  );
}
