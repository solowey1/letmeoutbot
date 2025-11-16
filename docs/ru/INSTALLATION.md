# Руководство по установке

## Быстрый старт (Рекомендуется)

### Автоматическая установка

Запустите интерактивный скрипт установки:

```bash
sudo bash install.sh
```

Скрипт проведёт вас через:
1. **Выбор базы данных** (SQLite, PostgreSQL или Supabase)
2. **Настройка БД** (учётные данные в зависимости от выбора)
3. **Настройка бота** (токен Telegram, ID админа, Outline API URL)
4. **Автоматическая настройка** (Docker, сервисы, файрвол)

### Варианты баз данных

#### 1. SQLite
- **Подходит для**: Тестирования, маленьких проектов
- **Плюсы**: Нулевая настройка, просто
- **Минусы**: Не масштабируется, файловая
- **Настройка**: Просто укажите путь к файлу

#### 2. PostgreSQL
- **Подходит для**: Средних проектов
- **Плюсы**: Надёжная, производительная, полный SQL
- **Минусы**: Требуется сервер БД
- **Варианты**:
  - **Локально**: Запуск в Docker (автоматическая настройка)
  - **Удалённо**: Подключение к существующему серверу

#### 3. Supabase (Рекомендуется)
- **Подходит для**: Продакшн, облако
- **Плюсы**: Управляемая, автобэкапы, масштабируемая
- **Минусы**: Требуется интернет
- **Получить учётные данные**: [Supabase Dashboard](https://app.supabase.com) → Settings → API

---

## Ручная установка

### Требования

- Node.js 18+
- npm
- Docker и Docker Compose (для продакшн)
- PostgreSQL клиент (для PostgreSQL/Supabase)

### Шаги

#### 1. Клонирование и установка

```bash
git clone <your-repo-url>
cd vpnbot
npm install
```

#### 2. Настройка окружения

```bash
cp .env.example .env
nano .env
```

Обязательные переменные:
```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
ADMIN_IDS=ваш_telegram_id
OUTLINE_API_URL=https://ваш-сервер:порт/api-ключ
DATABASE_TYPE=supabase  # или sqlite, postgres
```

#### 3. Настройка базы данных

**Для SQLite:**
```env
DATABASE_TYPE=sqlite
DATABASE_PATH=./database.db
```
Дополнительная настройка не нужна!

**Для PostgreSQL/Supabase:**
```bash
# Установите DATABASE_URL в .env
./init-database.sh
```

#### 4. Запуск бота

**Разработка:**
```bash
npm run dev
```

**Продакшн (Docker):**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Получение учётных данных

### Токен Telegram бота

1. Откройте [@BotFather](https://t.me/botfather)
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. **Важно**: Включите платежи (`/mybots` → Выберите бота → Payments)
5. Скопируйте токен

### ID админа Telegram

Отправьте `/start` боту [@userinfobot](https://t.me/userinfobot)

### Outline VPN API URL

1. Установите [Outline Manager](https://getoutline.org/get-started/)
2. Создайте сервер
3. Нажмите ⚙️ Настройки
4. Скопируйте "Management API URL"

Пример: `https://1.2.3.4:12345/aBcDeFgHiJ`

### Учётные данные Supabase

1. Перейдите в [Supabase Dashboard](https://app.supabase.com)
2. Создайте/выберите проект
3. Перейдите в Settings → API
4. Скопируйте:
   - **URL** (Project URL)
   - **API Key** (anon/public ключ)

---

## Проверка установки

Проверьте вашу установку:

```bash
./check-setup.sh
```

Скрипт проверит:
- Установлены ли зависимости
- Завершена ли настройка
- Доступна ли база данных
- Готов ли бот к запуску

---

## Решение проблем

### Бот не отвечает

```bash
# Проверить логи
docker-compose -f docker-compose.prod.yml logs -f

# Перезапустить
docker-compose -f docker-compose.prod.yml restart
```

### Проблемы с подключением к БД

**PostgreSQL/Supabase:**
```bash
# Проверить соединение
psql "$DATABASE_URL" -c "SELECT 1"
```

**SQLite:**
```bash
# Проверить права на файл
ls -la database.db
```

### Проблемы с платежами

- Включите платежи в [@BotFather](https://t.me/botfather)
- Telegram Stars должны быть доступны в вашем регионе

---

## Следующие шаги

1. Протестируйте бота: Отправьте `/start` в Telegram
2. Попробуйте процесс оплаты
3. Войдите в админ-панель: `/admin`
4. Просмотрите логи
5. Настройте мониторинг

---

Для более подробной информации см. [Краткое руководство](QUICK_START.md) или [Архитектура](ARCHITECTURE.md).
