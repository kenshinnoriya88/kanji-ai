import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { findStationCoords } from "@/lib/stations";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 候補エリアの座標
const AREAS: Record<string, [number, number]> = {
  "新宿": [35.6896, 139.6918],
  "渋谷": [35.6580, 139.7016],
  "池袋": [35.7295, 139.7109],
  "東京": [35.6812, 139.7671],
  "品川": [35.6284, 139.7387],
  "上野": [35.7141, 139.7774],
  "恵比寿": [35.6467, 139.7100],
};

/** 2点間の距離(km)をHaversine公式で計算 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: Request) {
  const { stations } = await request.json();

  // Step1: DBから座標を引く
  const coords: [number, number][] = [];
  const unknown: string[] = [];

  for (const s of stations as string[]) {
    const c = findStationCoords(s);
    if (c) {
      coords.push(c);
    } else {
      unknown.push(s);
    }
  }

  // Step2: DBにない駅はGroqに座標を聞く
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
          coords.push([s.lat, s.lng]);
        }
      }
    } catch (e) {
      console.error("座標取得失敗:", e);
    }
  }

  if (coords.length === 0) {
    return NextResponse.json({ error: "駅の位置を特定できませんでした" }, { status: 400 });
  }

  // Step3: 各エリアへの合計距離を計算し、最小のエリアを選ぶ
  let bestArea = "";
  let minTotal = Infinity;

  for (const [area, [aLat, aLng]] of Object.entries(AREAS)) {
    const total = coords.reduce(
      (sum, [sLat, sLng]) => sum + haversine(sLat, sLng, aLat, aLng),
      0
    );
    if (total < minTotal) {
      minTotal = total;
      bestArea = area;
    }
  }

  const avgKm = Math.round(minTotal / coords.length);
  const reason = `参加者全員からの平均直線距離が約${avgKm}kmで最も近いエリアです。`;

  return NextResponse.json({ area: bestArea, reason });
}
