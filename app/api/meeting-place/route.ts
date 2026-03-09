import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const AREAS = ["新宿", "渋谷", "池袋", "東京", "品川", "上野", "恵比寿"];

export async function POST(request: Request) {
  const { stations } = await request.json();

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `飲み会の集合場所を選んでください。
参加者の最寄駅: ${stations.join("、")}
候補エリア: ${AREAS.join("、")}
全員の合計移動時間が最小になるエリアを1つ選び、その理由を1文で説明してください。
JSONで回答: {"area": "エリア名", "reason": "理由"}`;

  const result = await model.generateContent(prompt);
  const json = JSON.parse(result.response.text());
  return NextResponse.json(json);
}
