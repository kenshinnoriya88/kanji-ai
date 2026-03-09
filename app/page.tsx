import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">幹事AI</h1>
          <p className="mt-2 text-gray-500">飲み会の幹事作業をAIでかんたんに</p>
        </div>

        <div className="space-y-3 text-left bg-white rounded-2xl p-6 shadow-sm">
          <Feature icon="📅" title="日程調整" desc="候補日の○△×を集計して自動決定" />
          <Feature icon="📍" title="集合場所提案" desc="全員の最寄駅から最適エリアをAIが選択" />
          <Feature icon="🍺" title="お店候補3選" desc="集合エリアの居酒屋をAIが提案" />
          <Feature icon="🗳️" title="お店投票" desc="参加者全員で投票して店を決定" />
        </div>

        <Link
          href="/create"
          className="block w-full bg-indigo-600 text-white text-lg font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          イベントを作成する
        </Link>

        <p className="text-sm text-gray-400">ログイン不要・URLを共有するだけ</p>
      </div>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
