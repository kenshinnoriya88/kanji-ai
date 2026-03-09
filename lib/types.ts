export type Availability = "○" | "△" | "×";

export type Event = {
  id: string;
  title: string;
  dates: string[];
  created_at: string;
};

export type Participant = {
  id: string;
  event_id: string;
  name: string;
  station: string;
  availability: Record<string, Availability>;
  created_at: string;
};

export type Restaurant = {
  id: string;
  event_id: string;
  name: string;
  votes: number;
  created_at: string;
};
