-- ============================================================
-- Миграция: переименование старых plan_id → новые
-- Затрагивает таблицы: keys, payments
-- ============================================================

-- Тестовые планы
UPDATE keys SET plan_id = 'outline_test' WHERE plan_id = 'test';
UPDATE payments SET plan_id = 'outline_test' WHERE plan_id = 'test';

UPDATE keys SET plan_id = 'vless_test' WHERE plan_id = 'test_vless';
UPDATE payments SET plan_id = 'vless_test' WHERE plan_id = 'test_vless';

-- Старые outline-планы → новые ID
UPDATE keys SET plan_id = 'outline_10gb' WHERE plan_id IN ('test_100mb', 'basic_10gb');
UPDATE payments SET plan_id = 'outline_10gb' WHERE plan_id IN ('test_100mb', 'basic_10gb');

UPDATE keys SET plan_id = 'outline_50gb' WHERE plan_id = 'basic_50gb';
UPDATE payments SET plan_id = 'outline_50gb' WHERE plan_id = 'basic_50gb';

UPDATE keys SET plan_id = 'outline_100gb' WHERE plan_id = 'standard_100gb';
UPDATE payments SET plan_id = 'outline_100gb' WHERE plan_id = 'standard_100gb';

UPDATE keys SET plan_id = 'outline_unlim' WHERE plan_id IN ('standard_300gb', 'pro_600gb', 'pro_1200gb');
UPDATE payments SET plan_id = 'outline_unlim' WHERE plan_id IN ('standard_300gb', 'pro_600gb', 'pro_1200gb');

SELECT 'Plan IDs migrated successfully!' as message;
