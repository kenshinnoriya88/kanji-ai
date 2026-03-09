import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { AREAS, getTravelTimes } from "@/lib/travelTimes";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { stations } = await request.json();

  // Step1: 各駅の所要時間を取得（DBにない駅はGroqで座標を補完）
  const allTimes: Record<string, number>[] = [];
  const unknown: string[] = [];

  for (const s of stations as string[]) {
    const times = getTravelTimes(s);
    if (times) {
      allTimes.push(times);
    } else {
      unknown.push(s);
    }
  }

  // Step2: DBにない駅はGroqに座標を聞いて最近傍推定
  if (unknown.length > 0) {
    try {
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `以下の日本の鉄道駅の緯度・経度を教えてください。
駅名: ${unknown.join("、")}
JSONで回答: {"stations": [{"name": "駅名", "lat": 緯度の数値, "lng": 経度の数値}]}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
      for (const s of parsed.stations ?? []) {
        if (typeof s.lat === "number" && typeof s.lng === "number") {
          const times = getTravelTimes(s.name, [s.lat, s.lng]);
          if (times) allTimes.push(times);
        }
      }
    } catch (e) {
      console.error("座標取得失敗:", e);
    }
  }

  if (allTimes.length === 0) {
    return NextResponse.json({ error: "駅の位置を特定できませんでした" }, { status: 400 });
  }

  // Step3: 各エリアの合計所要時間を集計し、最小を選ぶ
  let bestArea = "";
  let minTotal = Infinity;
  const areaTotals: Record<string, number> = {};

  for (const area of AREAS) {
    const total = allTimes.reduce((sum, times) => sum + (times[area] ?? 999), 0);
    areaTotals[area] = total;
    if (total < minTotal) {
      minTotal = total;
      bestArea = area;
    }
  }

  const avgMin = Math.round(minTotal / allTimes.length);
  const reason = `参加者全員の平均所要時間が約${avgMin}分で最も短いエリアです。`;

  return NextResponse.json({ area: bestArea, reason });
}
