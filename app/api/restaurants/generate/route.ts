import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { area, eventId } = await request.json();

  const prompt = `${area}エリアで飲み会に使える居酒屋を3つ提案してください。
架空の店名でも構いません。店名だけを教えてください。
JSONで回答: {"restaurants": [{"name": "店名"}, {"name": "店名"}, {"name": "店名"}]}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI生成に失敗しました" }, { status: 500 });
  }
}
