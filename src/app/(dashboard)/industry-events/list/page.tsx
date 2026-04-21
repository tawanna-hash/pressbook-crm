import { EventsList } from "./events-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string }>;

export default async function AllEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <EventsList
      title="All Events"
      searchParams={sp}
    />
  );
}
