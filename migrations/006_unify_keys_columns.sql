-- ============================================================
-- Миграция: унификация колонок таблицы keys
--
-- Было: outline_key_id, xray_email, vless_reality_uuid,
--        vless_reality_url, vless_reality_sub_id, vless_ws_*
-- Стало: external_key_id, external_client_id, external_sub_id
--        + access_url (уже есть, теперь используется для всех протоколов)
--
-- key_type: только 'outline' или 'vless' (без 'both', 'vless_ws', 'vless_reality')
-- ============================================================

-- 1. Добавляем новые унифицированные колонки
ALTER TABLE keys
ADD COLUMN IF NOT EXISTS external_key_id TEXT,
ADD COLUMN IF NOT EXISTS external_client_id TEXT,
ADD COLUMN IF NOT EXISTS external_sub_id TEXT;

-- 2. Мигрируем данные из старых колонок
-- Outline ключи: outline_key_id → external_key_id
UPDATE keys
SET external_key_id = outline_key_id::TEXT
WHERE outline_key_id IS NOT NULL AND external_key_id IS NULL;

-- VLESS ключи: vless_reality_uuid → external_key_id
UPDATE keys
SET external_key_id = vless_reality_uuid
WHERE vless_reality_uuid IS NOT NULL AND external_key_id IS NULL;

-- xray_email → external_client_id
UPDATE keys
SET external_client_id = xray_email
WHERE xray_email IS NOT NULL AND external_client_id IS NULL;

-- vless_reality_sub_id → external_sub_id
UPDATE keys
SET external_sub_id = vless_reality_sub_id
WHERE vless_reality_sub_id IS NOT NULL AND external_sub_id IS NULL;

-- VLESS ключи: access_url из vless_reality_url (если access_url пустой)
UPDATE keys
SET access_url = vless_reality_url
WHERE vless_reality_url IS NOT NULL AND access_url IS NULL;

-- 3. Нормализуем key_type: 'vless_reality' → 'vless', 'vless_ws' → 'vless'
UPDATE keys SET key_type = 'vless' WHERE key_type IN ('vless_reality', 'vless_ws');

-- 4. Обновляем CHECK constraint на key_type
ALTER TABLE keys DROP CONSTRAINT IF EXISTS keys_key_type_check;
ALTER TABLE keys ADD CONSTRAINT keys_key_type_check
  CHECK (key_type IN ('outline', 'vless'));

-- 5. Индексы на новые колонки
CREATE INDEX IF NOT EXISTS idx_keys_external_client_id ON keys(external_client_id);
DROP INDEX IF EXISTS idx_keys_xray_email;

-- 6. Удаляем старые колонки
ALTER TABLE keys
DROP COLUMN IF EXISTS outline_key_id,
DROP COLUMN IF EXISTS xray_email,
DROP COLUMN IF EXISTS vless_reality_uuid,
DROP COLUMN IF EXISTS vless_reality_url,
DROP COLUMN IF EXISTS vless_reality_sub_id,
DROP COLUMN IF EXISTS vless_ws_uuid,
DROP COLUMN IF EXISTS vless_ws_url,
DROP COLUMN IF EXISTS vless_ws_sub_id;

SELECT 'Migration: keys columns unified successfully!' as message;
