-- ============================================================
-- Миграция: поддержка MTProto-прокси в таблице keys
--
-- 1. CHECK constraint из 006 разрешал только 'outline'/'vless' —
--    покупка Proxy-плана падала на key_type = 'mtproto'.
-- 2. На колонке key_type оставался DEFAULT 'outline' (из 005):
--    новые записи до активации получали неверный тип.
--    Теперь тип задаётся явно при INSERT (см. createKey).
-- ============================================================

ALTER TABLE keys ALTER COLUMN key_type DROP DEFAULT;

ALTER TABLE keys DROP CONSTRAINT IF EXISTS keys_key_type_check;
ALTER TABLE keys ADD CONSTRAINT keys_key_type_check
  CHECK (key_type IN ('outline', 'vless', 'mtproto'));

-- Чиним записи, созданные до фикса: pending-ключи Proxy-планов
-- получили 'outline' из дефолта
UPDATE keys SET key_type = 'mtproto'
WHERE plan_id LIKE 'proxy_%' AND key_type <> 'mtproto';

SELECT 'Migration 009: mtproto key_type allowed, default dropped!' as message;
