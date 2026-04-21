import { ClientsList } from "../clients-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  view?: string;
  page?: string;
  size?: string;
}>;

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <ClientsList
      title="Prospects"
      subtitle="Leads and potential clients you're nurturing."
      forcedStatus="prospect"
      searchParams={sp}
    />
  );
}
