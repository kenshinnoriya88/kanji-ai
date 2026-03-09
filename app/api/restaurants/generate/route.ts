import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const { area, eventId } = await request.json();

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `${area}エリアで飲み会に使える居酒屋を3つ提案してください。
架空の店名でも構いません。店名だけを教えてください。
JSONで回答: {"restaurants": [{"name": "店名"}, {"name": "店名"}, {"name": "店名"}]}`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());

  const toInsert = (parsed.restaurants as { name: string }[]).map((r) => ({
    event_id: eventId,
    name: r.name,
    votes: 0,
  }));

  const { data, error } = await supabase.from("restaurants").insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ restaurants: data });
}
