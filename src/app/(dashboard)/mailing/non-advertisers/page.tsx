import { MailingList } from "../mailing-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ sort?: string; dir?: string; page?: string; size?: string }>;

export default async function NonAdvertisersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return <MailingList segment="non-advertiser" searchParams={sp} />;
}
