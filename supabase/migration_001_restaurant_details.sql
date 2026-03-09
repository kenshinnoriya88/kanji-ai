-- restaurants テーブルに店舗詳細カラムを追加
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS url         TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS image_url   TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT;
