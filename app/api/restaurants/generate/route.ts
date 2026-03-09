import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const { area, eventId } = await request.json();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `${area}エリアで飲み会に使える居酒屋を3つ提案してください。
架空の店名でも構いません。店名だけを教えてください。
JSONで回答: {"restaurants": [{"name": "店名"}, {"name": "店名"}, {"name": "店名"}]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
  const toInsert = (parsed.restaurants as { name: string }[]).map((r) => ({
    event_id: eventId,
    name: r.name,
    votes: 0,
  }));

  const { data, error } = await supabase.from("restaurants").insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ restaurants: data });
}
