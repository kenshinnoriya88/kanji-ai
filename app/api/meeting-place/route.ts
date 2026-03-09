import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AREAS = ["新宿", "渋谷", "池袋", "東京", "品川", "上野", "恵比寿"];

export async function POST(request: Request) {
  const { stations } = await request.json();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `飲み会の集合場所を選んでください。
参加者の最寄駅: ${stations.join("、")}
候補エリア: ${AREAS.join("、")}
全員の合計移動時間が最小になるエリアを1つ選び、その理由を1文で説明してください。
JSONで回答してください: {"area": "エリア名", "reason": "理由"}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content ?? "{}");
  return NextResponse.json(result);
}
