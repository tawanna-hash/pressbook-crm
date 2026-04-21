import { ClientsList } from "../clients-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  view?: string;
  page?: string;
  size?: string;
}>;

export default async function AllClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <ClientsList
      title="All Clients"
      subtitle="Switch companies in the sidebar to see the other list."
      searchParams={sp}
    />
  );
}
