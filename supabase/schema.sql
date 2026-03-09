-- 幹事AI データベーススキーマ
-- Supabase (PostgreSQL) 用

-- events テーブル
CREATE TABLE events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  dates      TEXT[] NOT NULL,          -- 候補日の配列 例: ['2024-04-01', '2024-04-05']
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- participants テーブル
CREATE TABLE participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  station      TEXT NOT NULL,          -- 最寄駅
  availability JSONB NOT NULL,         -- 例: {"2024-04-01": "○", "2024-04-05": "△"}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- restaurants テーブル
CREATE TABLE restaurants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  votes      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_participants_event_id  ON participants(event_id);
CREATE INDEX idx_restaurants_event_id   ON restaurants(event_id);

-- Row Level Security (RLS) の有効化
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants  ENABLE ROW LEVEL SECURITY;

-- ログインなしで全操作を許可するポリシー (MVP: 認証なし)
CREATE POLICY "allow_all_events"       ON events       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_participants" ON participants  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_restaurants"  ON restaurants   FOR ALL USING (true) WITH CHECK (true);
