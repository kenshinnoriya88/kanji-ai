import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface HotPepperShop {
  name: string;
  catch: string;
  access: string;
  urls: { pc: string; sp?: string };
  photo: {
    pc: { l: string; m: string; s: string };
    mobile: { l: string; s: string };
  };
}

export async function POST(request: Request) {
  const { area, eventId } = await request.json();

  const apiKey = process.env.HOTPEPPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "HOTPEPPER_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  // ── Step1: ホットペッパーAPIから実在店舗を3件取得 ──
  let shops: HotPepperShop[] = [];
  try {
    const params = new URLSearchParams({
      key: apiKey,
      keyword: area,
      genre: "G001", // 居酒屋
      count: "3",
      order: "4",    // ランダム順
      format: "json",
    });
    const res = await fetch(
      `http://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params}`
    );
    const data = await res.json();
    shops = data.results?.shop ?? [];

    if (shops.length === 0) {
      return NextResponse.json(
        { error: `${area}エリアでお店が見つかりませんでした` },
        { status: 404 }
      );
    }
  } catch (e) {
    console.error("HotPepper API エラー:", e);
    return NextResponse.json({ error: "お店の検索に失敗しました" }, { status: 500 });
  }

  // ── Step2: Groqで各店舗の紹介文を生成 ──
  let descriptions: string[] = [];
  try {
    const shopInfo = shops
      .map(
        (s, i) =>
          `店${i + 1}: ${s.name}\nキャッチ: ${s.catch}\nアクセス: ${s.access}`
      )
      .join("\n\n");

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `以下の居酒屋について、飲み会参加者が投票したくなる魅力的な紹介文を各店100文字程度の日本語で書いてください。
${shopInfo}
JSONで回答: {"descriptions": ["店1の紹介文", "店2の紹介文", "店3の紹介文"]}`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
    descriptions = parsed.descriptions ?? [];
  } catch (e) {
    console.error("Groq 紹介文生成エラー:", e);
    // 紹介文なしで続行
  }

  // ── Step3: Supabaseに保存 ──
  const toInsert = shops.map((shop, i) => ({
    event_id: eventId,
    name: shop.name,
    url: shop.urls.sp ?? shop.urls.pc,
    image_url: shop.photo.mobile.l || shop.photo.pc.m || null,
    description: descriptions[i] ?? null,
    votes: 0,
  }));

  const { data, error } = await supabase
    .from("restaurants")
    .insert(toInsert)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ restaurants: data });
}
