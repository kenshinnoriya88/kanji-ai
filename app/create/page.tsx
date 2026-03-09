"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);

  const addDate = () => setDates((prev) => [...prev, ""]);

  const removeDate = (i: number) =>
    setDates((prev) => prev.filter((_, idx) => idx !== i));

  const updateDate = (i: number, val: string) =>
    setDates((prev) => prev.map((d, idx) => (idx === i ? val : d)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDates = dates.filter((d) => d.trim());
    if (!title.trim() || validDates.length === 0) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .insert({ title: title.trim(), dates: validDates })
      .select("id")
      .single();

    if (error || !data) {
      alert("作成に失敗しました。Supabaseの設定を確認してください。");
      setLoading(false);
      return;
    }
    router.push(`/e/${data.id}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">イベント作成</h1>
            <p className="text-sm text-gray-500">イベント名と候補日を入力してください</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">イベント名</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 4月の飲み会"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">候補日</label>
            <div className="space-y-2">
              {dates.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="date"
                    value={d}
                    onChange={(e) => updateDate(i, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDate(i)}
                      className="text-gray-400 hover:text-red-500 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addDate}
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              + 候補日を追加
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? "作成中..." : "イベントを作成する"}
          </button>
        </form>
      </div>
    </main>
  );
}
