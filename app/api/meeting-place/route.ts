import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AREAS = ["新宿", "渋谷", "池袋", "東京", "品川", "上野", "恵比寿"];

export async function POST(request: Request) {
  const { stations } = await request.json();

  const prompt = `飲み会の集合場所を選んでください。
参加者の最寄駅: ${stations.join("、")}
候補エリア: ${AREAS.join("、")}
全員の合計移動時間が最小になるエリアを1つ選び、その理由を1文で説明してください。
JSONで回答: {"area": "エリア名", "reason": "理由"}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const json = JSON.parse(response.choices[0].message.content ?? "{}");
    return NextResponse.json(json);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI生成に失敗しました" }, { status: 500 });
  }
}
