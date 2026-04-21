import { ClientsList } from "../clients-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  view?: string;
  page?: string;
  size?: string;
}>;

export default async function ActiveClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <ClientsList
      title="Active Clients"
      subtitle="Clients you're currently working with."
      forcedStatus="active"
      searchParams={sp}
    />
  );
}
