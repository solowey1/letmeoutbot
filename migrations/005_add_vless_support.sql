-- ============================================================
-- Миграция 005: добавление поддержки VLESS ключей (legacy)
-- УСТАРЕЛА: колонки объединены в 006_unify_keys_columns.sql
-- Оставлена для совместимости с БД, где уже была применена.
-- ============================================================

-- Добавляем старые колонки (IF NOT EXISTS), чтобы миграция 006 могла их удалить
ALTER TABLE keys ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'outline';
ALTER TABLE keys ADD COLUMN IF NOT EXISTS vless_ws_uuid TEXT;
ALTER TABLE keys ADD COLUMN IF NOT EXISTS vless_ws_url TEXT;
ALTER TABLE keys ADD COLUMN IF NOT EXISTS vless_ws_sub_id TEXT;
ALTER TABLE keys ADD COLUMN IF NOT EXISTS vless_reality_uuid TEXT;
ALTER TABLE keys ADD COLUMN IF NOT EXISTS vless_reality_url TEXT;
ALTER TABLE keys ADD COLUMN IF NOT EXISTS vless_reality_sub_id TEXT;
ALTER TABLE keys ADD COLUMN IF NOT EXISTS xray_email TEXT;

SELECT 'Migration 005 (legacy) completed!' as message;
