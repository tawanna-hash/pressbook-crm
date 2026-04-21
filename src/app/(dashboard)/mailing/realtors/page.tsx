import { MailingList } from "../mailing-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ sort?: string; dir?: string }>;

export default async function RealtorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return <MailingList segment="realtor" searchParams={sp} />;
}
