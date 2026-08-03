-- ============================================================
-- Миграция: продажа прокси px6 (proxy6.net) в таблице keys
--
-- CHECK из 009 разрешал только outline/vless/mtproto — покупка
-- px6-прокси падала бы на key_type = 'px6'.
--
-- Реквизиты прокси кладём в существующие колонки:
--   external_key_id    — внутренний id прокси в px6 (нужен для prolong/delete)
--   external_client_id — descr, по нему прокси находится через getproxy
--   access_url         — строка host:port:user:pass для клиента
--                        (IPv6-адрес в квадратных скобках: [2001:db8::1]:9999:...)
-- ============================================================

ALTER TABLE keys DROP CONSTRAINT IF EXISTS keys_key_type_check;
ALTER TABLE keys ADD CONSTRAINT keys_key_type_check
  CHECK (key_type IN ('outline', 'vless', 'mtproto', 'px6'));

SELECT 'Migration 011: px6 key_type allowed!' as message;
