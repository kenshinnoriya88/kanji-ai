"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Event, Participant, Restaurant, Availability } from "@/lib/types";

type MeetingPlace = { area: string; reason: string };

const AVAIL_OPTIONS: Availability[] = ["○", "△", "×"];

const AVAIL_STYLE: Record<Availability, string> = {
  "○": "bg-green-500 text-white border-green-500",
  "△": "bg-yellow-400 text-white border-yellow-400",
  "×": "bg-gray-400 text-white border-gray-400",
};

const AVAIL_BADGE: Record<Availability, string> = {
  "○": "bg-green-100 text-green-700",
  "△": "bg-yellow-100 text-yellow-700",
  "×": "bg-gray-100 text-gray-500",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function computeScores(dates: string[], participants: Participant[]) {
  return dates.map((date) => {
    let score = 0;
    const counts: Record<string, number> = { "○": 0, "△": 0, "×": 0 };
    for (const p of participants) {
      const a = (p.availability as Record<string, Availability>)[date] ?? "×";
      counts[a] = (counts[a] ?? 0) + 1;
      if (a === "○") score += 1;
      else if (a === "△") score += 0.5;
    }
    return { date, score, counts };
  });
}

export default function EventPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [meetingPlace, setMeetingPlace] = useState<MeetingPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [loadingRests, setLoadingRests] = useState(false);

  // 参加者フォームの状態
  const [name, setName] = useState("");
  const [station, setStation] = useState("");
  const [availability, setAvailability] = useState<Record<string, Availability>>({});

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function loadData() {
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!ev) {
      setLoading(false);
      return;
    }
    setEvent(ev);

    // 可否フォームの初期値（全日程○）
    const initAvail: Record<string, Availability> = {};
    for (const d of (ev.dates as string[])) initAvail[d] = "○";
    setAvailability(initAvail);

    const { data: parts } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at");
    setParticipants(parts ?? []);

    const { data: rests } = await supabase
      .from("restaurants")
      .select("*")
      .eq("event_id", eventId)
      .order("votes", { ascending: false });
    setRestaurants(rests ?? []);

    setLoading(false);
  }

  async function handleSubmitParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !station.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("participants")
      .insert({ event_id: eventId, name: name.trim(), station: station.trim(), availability })
      .select()
      .single();

    if (!error && data) {
      setParticipants((prev) => [...prev, data]);
      setName("");
      setStation("");
      const initAvail: Record<string, Availability> = {};
      for (const d of (event!.dates as string[])) initAvail[d] = "○";
      setAvailability(initAvail);
    }
    setSubmitting(false);
  }

  async function handleGetMeetingPlace() {
    if (participants.length === 0) return;
    setLoadingPlace(true);
    const stations = participants.map((p) => p.station);
    try {
      const res = await fetch("/api/meeting-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stations }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMeetingPlace(data);
    } catch {
      alert("集合場所の取得に失敗しました。しばらく待ってから再試行してください。");
    } finally {
      setLoadingPlace(false);
    }
  }

  async function handleGenerateRestaurants() {
    if (!meetingPlace) return;
    setLoadingRests(true);
    try {
      const res = await fetch("/api/restaurants/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: meetingPlace.area, eventId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.restaurants) setRestaurants(data.restaurants);
    } catch {
      alert("お店の取得に失敗しました。しばらく待ってから再試行してください。");
    } finally {
      setLoadingRests(false);
    }
  }

  async function handleVote(restaurantId: string) {
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId }),
    });
    if (res.ok) {
      setRestaurants((prev) =>
        prev
          .map((r) => (r.id === restaurantId ? { ...r, votes: r.votes + 1 } : r))
          .sort((a, b) => b.votes - a.votes)
      );
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    alert("URLをコピーしました！参加者に共有してください。");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">イベントが見つかりません</p>
      </div>
    );
  }

  const dates = event.dates as string[];
  const scores = computeScores(dates, participants);
  const maxScore = Math.max(...scores.map((s) => s.score), 0);
  const decidedDate = participants.length > 0 && maxScore > 0
    ? scores.find((s) => s.score === maxScore)
    : null;

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* ヘッダー */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 truncate">{event.title}</h1>
        <button
          onClick={handleShare}
          className="shrink-0 ml-3 text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
        >
          URLをコピー
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5 mt-5">

        {/* 参加登録フォーム */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">参加登録</h2>
          <form onSubmit={handleSubmitParticipant} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">名前</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="田中太郎"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">最寄駅</label>
                <input
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  placeholder="渋谷駅"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">日程の可否</label>
              <div className="space-y-2">
                {dates.map((date) => (
                  <div key={date} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-24 shrink-0">{formatDate(date)}</span>
                    <div className="flex gap-2">
                      {AVAIL_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAvailability((prev) => ({ ...prev, [date]: opt }))}
                          className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${
                            availability[date] === opt
                              ? AVAIL_STYLE[opt]
                              : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "登録中..." : "参加登録する"}
            </button>
          </form>
        </section>

        {/* 参加者一覧 */}
        {participants.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              参加者一覧（{participants.length}人）
            </h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left pb-2 font-medium pr-3">名前</th>
                    <th className="text-left pb-2 font-medium pr-3">最寄駅</th>
                    {dates.map((d) => (
                      <th key={d} className="pb-2 font-medium text-center px-1">
                        {formatDate(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 pr-3 font-medium text-gray-800">{p.name}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{p.station}</td>
                      {dates.map((d) => {
                        const a = ((p.availability as Record<string, Availability>)[d] ?? "×");
                        return (
                          <td key={d} className="py-2 text-center px-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${AVAIL_BADGE[a]}`}>
                              {a}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 日程集計 */}
        {participants.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">日程集計</h2>
            <div className="space-y-2">
              {scores
                .slice()
                .sort((a, b) => b.score - a.score)
                .map(({ date, score, counts }) => {
                  const isTop = decidedDate?.date === date;
                  return (
                    <div
                      key={date}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        isTop ? "bg-green-50 border border-green-200" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isTop && <span className="text-green-600">★</span>}
                        <span className={`font-medium text-sm ${isTop ? "text-green-700" : "text-gray-700"}`}>
                          {formatDate(date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 font-medium">○{counts["○"]}</span>
                        <span className="text-yellow-600 font-medium">△{counts["△"]}</span>
                        <span className="text-gray-400">×{counts["×"]}</span>
                        <span className="text-gray-600 font-semibold ml-1">スコア {score}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
            {decidedDate && (
              <p className="mt-3 text-sm text-green-700 font-medium bg-green-50 rounded-lg px-3 py-2">
                決定日程: {formatDate(decidedDate.date)}
              </p>
            )}
          </section>
        )}

        {/* 集合場所 */}
        {participants.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">集合場所</h2>
            {meetingPlace ? (
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-indigo-700">{meetingPlace.area}</p>
                <p className="text-sm text-indigo-600 mt-1">{meetingPlace.reason}</p>
              </div>
            ) : (
              <button
                onClick={handleGetMeetingPlace}
                disabled={loadingPlace}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loadingPlace ? "AIが考え中..." : "AIに集合場所を提案してもらう"}
              </button>
            )}
          </section>
        )}

        {/* お店候補 & 投票 */}
        {meetingPlace && (
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              お店候補 {restaurants.length > 0 && `（${meetingPlace.area}）`}
            </h2>
            {restaurants.length > 0 ? (
              <div className="space-y-4">
                {restaurants.map((r, i) => (
                  <div
                    key={r.id}
                    className={`rounded-2xl overflow-hidden border shadow-sm ${
                      i === 0 && r.votes > 0
                        ? "border-yellow-300"
                        : "border-gray-200"
                    }`}
                  >
                    {/* 店舗画像 */}
                    {r.image_url ? (
                      <div className="relative h-44 bg-gray-100">
                        <img
                          src={r.image_url}
                          alt={r.name}
                          className="w-full h-full object-cover"
                        />
                        {i === 0 && r.votes > 0 && (
                          <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow">
                            👑 現在1位
                          </span>
                        )}
                      </div>
                    ) : (
                      i === 0 && r.votes > 0 && (
                        <div className="bg-yellow-50 px-4 pt-3">
                          <span className="text-xs font-bold text-yellow-600">👑 現在1位</span>
                        </div>
                      )
                    )}

                    {/* 店舗情報 */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 text-base leading-snug flex-1">
                          {r.name}
                        </h3>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50 transition-colors"
                          >
                            詳細 ↗
                          </a>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          {r.description}
                        </p>
                      )}
                      {/* 投票 */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500 font-medium">
                          {r.votes}票
                        </span>
                        <button
                          onClick={() => handleVote(r.id)}
                          className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          👍 投票する
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={handleGenerateRestaurants}
                disabled={loadingRests}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loadingRests ? "お店を検索中..." : "ホットペッパーでお店を探す"}
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
