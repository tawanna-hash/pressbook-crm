import { ClientsList } from "../clients-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  view?: string;
  page?: string;
  size?: string;
}>;

export default async function InactiveClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <ClientsList
      title="Inactive Clients"
      subtitle="Archived clients you no longer actively work with."
      forcedStatus="inactive"
      searchParams={sp}
    />
  );
}
