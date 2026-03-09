import EventPage from "./EventPage";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function Page({ params }: Props) {
  const { eventId } = await params;
  return <EventPage eventId={eventId} />;
}
