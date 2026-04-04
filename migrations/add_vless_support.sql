-- ============================================================
-- Миграция: добавление поддержки VLESS ключей
-- Запустить в Supabase SQL Editor
-- ============================================================

-- 1. Добавляем тип ключа в таблицу keys
ALTER TABLE keys
ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'outline'
  CHECK (key_type IN ('outline', 'vless_ws', 'vless_reality', 'both'));

-- 2. Добавляем поля для VLESS WS клиента
ALTER TABLE keys
ADD COLUMN IF NOT EXISTS vless_ws_uuid TEXT,
ADD COLUMN IF NOT EXISTS vless_ws_url TEXT,
ADD COLUMN IF NOT EXISTS vless_ws_sub_id TEXT;

-- 3. Добавляем поля для VLESS Reality клиента
ALTER TABLE keys
ADD COLUMN IF NOT EXISTS vless_reality_uuid TEXT,
ADD COLUMN IF NOT EXISTS vless_reality_url TEXT,
ADD COLUMN IF NOT EXISTS vless_reality_sub_id TEXT;

-- 4. Добавляем email клиента в 3X-UI (используется как уникальный идентификатор)
ALTER TABLE keys
ADD COLUMN IF NOT EXISTS xray_email TEXT;

-- 5. Переименовываем outline_key_id для ясности (поле уже есть, просто добавим индекс)
CREATE INDEX IF NOT EXISTS idx_keys_xray_email ON keys(xray_email);
CREATE INDEX IF NOT EXISTS idx_keys_key_type ON keys(key_type);

-- 6. Для существующих ключей проставляем тип
UPDATE keys SET key_type = 'outline' WHERE key_type IS NULL;

SELECT 'Migration completed successfully!' as message;
