import { EventsList } from "../events-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string }>;

export default async function UpcomingEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <EventsList
      title="Upcoming Events"
      subtitle="Events happening from today forward."
      scope="upcoming"
      basePath="/industry-events/list/upcoming"
      searchParams={sp}
    />
  );
}
