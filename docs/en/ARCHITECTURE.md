# Архитектура VPN Telegram Bot

## Обзор

VPN Telegram Bot - это модульное приложение для автоматизации продажи VPN ключей через Telegram с оплатой Telegram Stars.

## Структура проекта

```
vpnbot/
├── src/
│   ├── index.js                    # Точка входа
│   ├── bot/
│   │   └── index.js                # Главный класс бота
│   ├── bot/handlers/
│   │   └── callbacks/              # Обработчики callback-запросов
│   │       ├── AdminCallbacks.js   # Админ функции
│   │       ├── KeysCallbacks.js    # Управление ключами
│   │       ├── PlanCallbacks.js    # Выбор планов
│   │       ├── MenuCallbacks.js    # Навигация по меню
│   │       └── LanguageCallbacks.js # Выбор языка
│   ├── bot/listeners/
│   │   ├── CallbackHandler.js      # Маршрутизатор callback
│   │   ├── CommandHandlers.js      # Обработчики команд
│   │   ├── MessageHandlers.js      # Обработчики сообщений
│   │   └── PaymentHandlers.js      # Обработчики платежей
│   ├── services/
│   │   ├── PaymentService.js       # Сервис платежей
│   │   ├── KeysService.js          # Управление ключами
│   │   ├── OutlineService.js       # API Outline VPN
│   │   ├── PlanService.js          # Тарифные планы
│   │   ├── NotificationService.js  # Уведомления
│   │   └── I18nService.js          # Интернационализация
│   ├── services/messages/          # Шаблоны сообщений
│   │   ├── AdminMessages.js
│   │   ├── KeysMessages.js
│   │   ├── PlanMessages.js
│   │   ├── MenuMessages.js
│   │   └── index.js
│   ├── models/
│   │   ├── Database.js             # SQLite модель
│   │   ├── PostgresDatabase.js     # PostgreSQL модель
│   │   └── SupabaseDatabase.js     # Supabase модель
│   ├── middleware/
│   │   └── i18nMiddleware.js       # Middleware для i18n
│   ├── utils/
│   │   └── keyboards.js            # Клавиатуры
│   └── config/
│       ├── constants.js            # Константы
│       └── index.js                # Конфигурация
├── migrations/
│   └── init.sql                    # Схема БД
├── locales/                        # Переводы
│   ├── en.json
│   └── ru.json
├── install.sh                      # Скрипт установки
├── quick-start.sh                  # Быстрый старт для dev
├── init-database.sh                # Инициализация БД
├── check-setup.sh                  # Проверка настройки
└── docs/                           # Документация
    ├── en/                         # Английская
    └── ru/                         # Русская
```

## Архитектурные слои

### 1. Presentation Layer (Бот)
- **bot/index.js**: Главный класс бота, инициализация
- **bot/listeners/**: Обработчики событий Telegram
- **bot/handlers/callbacks/**: Специфичные обработчики кнопок

### 2. Service Layer (Бизнес-логика)
- **PaymentService**: Создание инвойсов, обработка платежей
- **KeysService**: Создание, мониторинг, управление VPN ключами
- **OutlineService**: Интеграция с Outline VPN API
- **PlanService**: Управление тарифными планами
- **NotificationService**: Отправка уведомлений пользователям
- **I18nService**: Многоязычная поддержка

### 3. Data Layer (Данные)
- **models/**: Абстракция над различными БД
  - SQLite для разработки
  - PostgreSQL для средних проектов
  - Supabase для продакшн

### 4. Infrastructure (Инфраструктура)
- **middleware/**: Промежуточное ПО
- **utils/**: Вспомогательные функции
- **config/**: Конфигурация приложения

## Поток данных

### Покупка VPN ключа

```
Пользователь нажимает "Купить VPN"
  ↓
MenuCallbacks обрабатывает callback
  ↓
Показывает список планов (PlanService)
  ↓
Пользователь выбирает план
  ↓
PlanCallbacks создаёт инвойс (PaymentService)
  ↓
Telegram показывает форму оплаты
  ↓
Пользователь оплачивает
  ↓
PaymentHandlers обрабатывает успешную оплату
  ↓
KeysService создаёт VPN ключ (OutlineService)
  ↓
Ключ сохраняется в БД
  ↓
Пользователь получает ключ доступа
```

### Мониторинг лимитов

```
Cron задача (каждые 30 мин)
  ↓
KeysService.checkAllActiveKeys()
  ↓
Для каждого активного ключа:
  ↓
OutlineService получает использование трафика
  ↓
Сравнивает с лимитами
  ↓
Если близок к лимиту:
  ↓
NotificationService отправляет уведомление
  ↓
Сохраняет в БД (чтобы не дублировать)
  ↓
Если превышен лимит:
  ↓
OutlineService удаляет ключ
  ↓
Обновляет статус в БД
```

## Модели данных

### Users (Пользователи)
```javascript
{
  id: Integer (PK),
  telegram_id: BigInt (Unique),
  username: String,
  first_name: String,
  last_name: String,
  language_code: String,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Keys (VPN Ключи)
```javascript
{
  id: Integer (PK),
  user_id: Integer (FK → users),
  plan_id: String,
  outline_key_id: Integer,
  access_url: Text,
  data_limit: BigInt (bytes),
  data_used: BigInt (bytes),
  expires_at: Timestamp,
  status: String (pending/active/expired/suspended),
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Payments (Платежи)
```javascript
{
  id: Integer (PK),
  user_id: Integer (FK → users),
  plan_id: String,
  amount: Integer (Telegram Stars),
  currency: String ('XTR'),
  telegram_payment_charge_id: String (Unique),
  status: String (pending/completed/failed/refunded),
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Usage Logs (Логи использования)
```javascript
{
  id: Integer (PK),
  key_id: Integer (FK → keys),
  data_used: BigInt (bytes),
  logged_at: Timestamp
}
```

### Notifications (Уведомления)
```javascript
{
  id: Integer (PK),
  key_id: Integer (FK → keys),
  notification_type: String,
  threshold_value: Integer,
  sent_at: Timestamp
}
```

## Ключевые паттерны

### 1. Service Pattern
Вся бизнес-логика инкапсулирована в сервисах:
- Легко тестировать
- Переиспользуемая логика
- Четкое разделение ответственности

### 2. Repository Pattern
Модели БД абстрагируют доступ к данным:
- Легко переключаться между БД
- Единый интерфейс
- Независимость от конкретной БД

### 3. Middleware Pattern
Middleware для обработки запросов:
- i18n для многоязычности
- Автоматическое создание пользователей
- Логирование

### 4. Factory Pattern
Динамическое создание экземпляров БД:
```javascript
if (DATABASE_TYPE === 'supabase') {
  db = new SupabaseDatabase(...)
} else if (DATABASE_TYPE === 'postgres') {
  db = new PostgresDatabase(...)
} else {
  db = new SQLiteDatabase(...)
}
```

## Особенности реализации

### Обработка ошибок
- Try-catch блоки во всех критичных местах
- Retry механизм для Outline API (3 попытки)
- Логирование всех ошибок
- Уведомление пользователей о проблемах

### Безопасность
- Валидация всех входных данных
- Проверка прав доступа (ADMIN_IDS)
- Безопасное хранение секретов (.env)
- Защита от SQL инъекций (параметризованные запросы)

### Производительность
- Индексы на часто запрашиваемых полях
- Кэширование планов
- Асинхронная обработка
- Батчинг уведомлений

### Масштабируемость
- Stateless дизайн (можно запускать несколько инстансов)
- Поддержка облачных БД (Supabase)
- Горизонтальное масштабирование через балансировщик
- Раздельные сервисы (микросервисная архитектура возможна)

## Интеграции

### Telegram Bot API
- Telegraf фреймворк
- Inline клавиатуры
- Telegram Stars платежи
- Webhook / Long polling

### Outline VPN API
- Создание ключей доступа
- Мониторинг использования
- Управление лимитами
- Удаление ключей

### Базы данных
- SQLite через sqlite3
- PostgreSQL через pg
- Supabase через @supabase/supabase-js

## Конфигурация

### Переменные окружения
```env
# Telegram
TELEGRAM_BOT_TOKEN=xxx
ADMIN_IDS=123,456

# Outline
OUTLINE_API_URL=https://...

# Database
DATABASE_TYPE=supabase
SUPABASE_URL=https://...
SUPABASE_API_KEY=xxx

# App
NODE_ENV=production
LOG_LEVEL=info
```

### Константы
- Тарифные планы
- Типы уведомлений
- Тексты сообщений
- Лимиты и пороги

## Deployment

### Docker
- Multi-stage builds
- Health checks
- Volume mounts для persistence
- Network isolation

### Process Management
- PM2 для Node.js процессов
- Systemd для Docker Compose
- Auto-restart on failure
- Log rotation

## Мониторинг

### Логирование
- Структурированные логи
- Различные уровни (debug, info, warn, error)
- Timestamp и context
- Rotation (10MB max, 3 files)

### Метрики
- Статистика пользователей
- Активные ключи
- Платежи
- Revenue tracking

### Алерты
- Критические ошибки
- Проблемы с Outline API
- Превышение лимитов
- Неуспешные платежи

## Разработка

### Окружения
- **Development**: SQLite, hot reload, debug logs
- **Production**: Supabase/PostgreSQL, Docker, info logs

### Тестирование
- Unit tests для сервисов
- Integration tests для API
- E2E tests для критичных flows

### CI/CD
- Автоматическое тестирование
- Docker image build
- Deployment на сервер
- Database migrations

## Будущие улучшения

### Планируется
- [ ] Перевод ARCHITECTURE.md на английский
- [ ] Реферальная программа
- [ ] Telegram Mini App для статистики
- [ ] Множественные Outline серверы
- [ ] Аналитика поведения пользователей
- [ ] A/B тестирование цен
- [ ] Webhook вместо long polling
- [ ] Redis для кэширования
- [ ] GraphQL API
- [ ] Web админ-панель

---

**Версия архитектуры**: 2.0