# Настройка Supabase для VPN Bot

## Шаг 1: Создание проекта в Supabase

1. Зайдите на https://supabase.com/dashboard
2. Нажмите **"New Project"**
3. Заполните:
   - **Name:** `vpnbot` (или любое имя)
   - **Database Password:** Сгенерируйте надежный пароль (сохраните его!)
   - **Region:** Выберите ближайший регион (например, `eu-central-1` для Европы)
4. Нажмите **"Create new project"** (займет 1-2 минуты)

## Шаг 2: Получение API ключей

1. В левом меню выберите **Settings** (⚙️) → **API**
2. Найдите секцию **"Project API keys"**
3. Скопируйте:
   - **Project URL** (например: `https://zvipxeojiiyhfelsekjt.supabase.co`)
   - **anon public** ключ (длинный JWT токен)

## Шаг 3: Создание таблиц в Supabase

1. В левом меню выберите **SQL Editor**
2. Нажмите **"New query"**
3. Скопируйте **ВСЁ** содержимое файла `migrations/001_initial_schema.sql`
4. Вставьте в редактор
5. Нажмите **"Run"** (или Ctrl/Cmd + Enter)
6. Дождитесь сообщения:
   ```
   VPN Bot schema created successfully!
   ```

## Шаг 4: Настройка переменных окружения

### Локальная разработка (.env)

Отредактируйте файл `.env` в корне проекта:

```env
# Database Configuration
DATABASE_TYPE=supabase

# Supabase (РЕКОМЕНДУЕТСЯ)
SUPABASE_URL=https://zvipxeojiiyhfelsekjt.supabase.co
SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Остальные настройки
TELEGRAM_BOT_TOKEN=your_token
OUTLINE_API_URL=your_outline_url
ADMIN_IDS=123456789
```

### Продакшн (Docker на сервере)

Обновите `.env` на сервере:

```bash
# На сервере
cd ~/letmeoutbot
nano .env
```

Добавьте:
```env
DATABASE_TYPE=supabase
SUPABASE_URL=https://zvipxeojiiyhfelsekjt.supabase.co
SUPABASE_API_KEY=your_anon_key_here
```

## Шаг 5: Тестирование подключения

### Локально:

```bash
# Установите зависимости
npm install

# Запустите тест подключения
node test-supabase.js
```

Ожидаемый результат:
```
🧪 Тестирование Supabase подключения...

📝 Supabase URL: https://zvipxeojiiyhfelsekjt.supabase.co
📝 API Key: eyJhbGciOiJIUzI1NiIs...

✅ Supabase клиент инициализирован
1️⃣ Проверка подключения...
   ✅ Подключение к Supabase установлено

2️⃣ Проверка таблицы users...
   ✅ Найдено пользователей: 0

3️⃣ Проверка таблицы subscriptions...
   ✅ Активных подписок: 0
   ✅ Pending подписок: 0

4️⃣ Получение статистики...
   ✅ Статистика:
      - Всего пользователей: 0
      - Активных подписок: 0
      - Завершённых платежей: 0
      - Общий доход: 0 XTR

✅ Все тесты прошли успешно!
🚀 Supabase готов к использованию
```

### Запуск бота:

```bash
# Локально
npm start
```

Ищите в логах:
```
☁️  Используется Supabase (рекомендуется)
✅ Supabase клиент инициализирован
✅ Подключение к Supabase установлено
```

### На сервере:

```bash
# Пересоберите контейнер
cd ~/letmeoutbot
docker-compose down
docker-compose build
docker-compose up -d

# Проверьте логи
docker logs vpnbot-prod -f
```

## Шаг 6: Проверка данных в Supabase

1. Откройте **Table Editor** в Supabase Dashboard
2. Вы увидите 5 таблиц:
   - `users` - пользователи бота
   - `subscriptions` - подписки/ключи
   - `payments` - платежи
   - `usage_logs` - логи использования трафика
   - `notifications` - отправленные уведомления
3. После первого запуска `/start` в боте появится запись в таблице `users`

## Преимущества Supabase JS API

✅ **Простое подключение** - только URL и API ключ, без сложных connection strings
✅ **Автоматический SSL** - безопасное соединение из коробки
✅ **Встроенная авторизация** - защита через API ключи
✅ **Real-time возможности** - можно добавить в будущем
✅ **REST API из коробки** - автоматический API для всех таблиц
✅ **Лучшая документация** - официальная JS библиотека от Supabase

## Полезные SQL запросы в Supabase

### Проверить всех пользователей:
```sql
SELECT * FROM users ORDER BY created_at DESC;
```

### Проверить активные подписки:
```sql
SELECT
    s.*,
    u.username,
    u.first_name
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

### Проверить pending подписки:
```sql
SELECT
    s.id,
    s.status,
    s.created_at,
    u.telegram_id,
    u.username
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'pending'
ORDER BY s.created_at DESC;
```

### Статистика бота:
```sql
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subs,
    (SELECT SUM(amount) FROM payments WHERE status = 'completed') as total_revenue,
    (SELECT COUNT(*) FROM payments WHERE status = 'completed') as completed_payments;
```

## Troubleshooting

### Ошибка: "Could not find the table 'public.users'"
```
❌ Could not find the table 'public.users' in the schema cache
```
**Решение:** Выполните миграцию `migrations/001_initial_schema.sql` в Supabase SQL Editor

### Ошибка: "Invalid API key"
```
❌ Invalid API key
```
**Решение:**
- Проверьте, что скопировали **anon public** ключ (не service_role!)
- Убедитесь, что нет лишних пробелов в .env файле

### Ошибка подключения в Docker
```bash
# Проверьте логи
docker logs vpnbot-prod --tail 100

# Проверьте переменные окружения
docker exec vpnbot-prod env | grep SUPABASE
```

### Бот не видит таблицы
1. Откройте Supabase Dashboard → SQL Editor
2. Выполните:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```
3. Должны быть: users, subscriptions, payments, usage_logs, notifications

## Row Level Security (RLS)

По умолчанию Supabase включает RLS (Row Level Security). Для работы бота через `anon` ключ нужно настроить политики:

### Вариант 1: Отключить RLS (для простоты, только для этого проекта)

```sql
-- В Supabase SQL Editor
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

### Вариант 2: Настроить политики (рекомендуется для продакшна)

```sql
-- Разрешить все операции для anon ключа
CREATE POLICY "Enable all for anon" ON users FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON payments FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON usage_logs FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON notifications FOR ALL USING (true);
```

## Бэкапы

Supabase автоматически делает бэкапы на платном плане ($25/мес).

На бесплатном плане делайте ручные экспорты:

1. **Через Table Editor:**
   - Откройте таблицу → Export → CSV

2. **Через SQL Editor:**
```sql
-- Экспортируйте данные
COPY users TO '/tmp/users.csv' WITH CSV HEADER;
COPY subscriptions TO '/tmp/subscriptions.csv' WITH CSV HEADER;
COPY payments TO '/tmp/payments.csv' WITH CSV HEADER;
```

## Мониторинг

В Supabase Dashboard → **Database** → **Usage** отслеживайте:
- Размер БД
- Количество активных подключений
- Запросы в секунду

**Бесплатный лимит:**
- 500 MB БД
- 2 GB bandwidth/месяц
- 500k Edge Function invocations

## Переключение между БД

### SQLite (локальная разработка):
```env
DATABASE_TYPE=sqlite
DATABASE_PATH=./database.db
```

### Supabase (рекомендуется):
```env
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_API_KEY=your_anon_key
```

### PostgreSQL Direct (альтернатива):
```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://...
```
