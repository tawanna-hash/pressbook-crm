import { EventsList } from "../events-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string }>;

export default async function PastEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <EventsList
      title="Past Events"
      subtitle="Events that have already taken place."
      scope="past"
      basePath="/industry-events/list/past"
      searchParams={sp}
    />
  );
}
