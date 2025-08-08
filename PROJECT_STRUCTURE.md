# 📁 Структура проекта VPN Bot

Детальное описание архитектуры и организации файлов проекта.

```
vpnbot/
├── 📄 README.md                    # Основная документация
├── 📄 DEPLOYMENT.md                # Руководство по развертыванию
├── 📄 DOCKER_GUIDE.md              # Подробное руководство по Docker
├── 📄 QUICK_START.md               # Быстрый старт за 5 минут
├── 📄 SYSTEM_REQUIREMENTS.md       # Системные требования
├── 📄 PROJECT_STRUCTURE.md         # Этот файл
│
├── 🐳 Docker файлы
│   ├── Dockerfile                  # Образ для продакшн
│   ├── .dockerignore              # Игнорируемые файлы Docker
│   ├── docker-compose.yml         # Для разработки
│   └── docker-compose.prod.yml    # Для продакшн
│
├── 🛠️ Автоматизация
│   ├── Makefile                   # Команды управления
│   ├── install.sh                 # Автоматическая установка
│   └── scripts/
│       ├── deploy.sh              # Развертывание
│       ├── update.sh              # Обновление
│       ├── backup.sh              # Создание бэкапов
│       └── monitor.sh             # Мониторинг системы
│
├── 📦 Конфигурация Node.js
│   ├── package.json               # Зависимости и скрипты
│   ├── .env.example              # Пример переменных окружения
│   └── .gitignore                # Игнорируемые Git файлы
│
└── 💾 Исходный код
    └── src/
        ├── 📋 index.js                    # Точка входа (главный файл)
        │
        ├── ⚙️ config/                     # Конфигурация
        │   ├── constants.js               # Константы, тарифы, сообщения
        │   └── database.js                # Настройки БД и приложения
        │
        ├── 🗄️ models/                     # Модели данных
        │   └── Database.js                # Работа с SQLite базой
        │
        ├── 🔧 services/                   # Бизнес-логика
        │   ├── PlanService.js             # Управление тарифными планами
        │   ├── PaymentService.js          # Обработка платежей Telegram Stars
        │   ├── SubscriptionService.js     # Управление подписками и лимитами
        │   └── OutlineService.js          # Интеграция с Outline Server API
        │
        ├── 🎮 handlers/                   # Обработчики событий
        │   └── callbackHandler.js         # Обработка inline кнопок
        │
        └── 🛠️ utils/                      # Утилиты
            └── keyboards.js               # Создание inline клавиатур
```

## 🏗️ Архитектура проекта

### 📐 Паттерн MVC
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │     Models      │
│   (Handlers)    │───►│ (Business Logic)│───►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   User Interface          Payment Logic           Data Storage
   (Keyboards)            (Subscriptions)            (SQLite)
```

### 🔄 Поток данных
```
Telegram User
     │
     ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│    Bot      │───►│ CallbackQuery │───►│  Handlers   │
│  (index.js) │    │   Router      │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
     │                                         │
     ▼                                         ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Services   │◄───│  Database    │◄───│ Outline API │
│             │    │              │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
```

## 📂 Детальное описание папок

### 🏠 Корневая директория
- **README.md** - Главная документация проекта
- **package.json** - Зависимости, скрипты, метаданные
- **.env.example** - Пример конфигурации переменных окружения
- **Makefile** - Команды для управления проектом

### 🐳 Docker конфигурация
```
├── Dockerfile                 # Multi-stage build для оптимизации
├── .dockerignore             # Исключения для Docker сборки
├── docker-compose.yml        # Локальная разработка
└── docker-compose.prod.yml   # Продакшн развертывание
```

### 🛠️ Автоматизация и скрипты
```
├── install.sh                # Полная автоматическая установка
└── scripts/
    ├── deploy.sh             # Развертывание на сервере
    ├── update.sh             # Обновление существующей установки
    ├── backup.sh             # Создание бэкапов БД и конфигов
    └── monitor.sh            # Мониторинг состояния системы
```

### 💻 Исходный код (src/)

#### 📋 index.js - Точка входа
- Инициализация бота
- Настройка обработчиков
- Управление жизненным циклом
- CRON задачи для мониторинга

#### ⚙️ config/ - Конфигурация
```javascript
// constants.js - Все константы проекта
- PLANS: Тарифные планы с ценами
- SUBSCRIPTION_STATUS: Статусы подписок
- PAYMENT_STATUS: Статусы платежей
- MESSAGES: Шаблоны сообщений
- CALLBACK_ACTIONS: Действия кнопок

// database.js - Настройки приложения
- Конфигурация подключения к БД
- Настройки Telegram API
- Параметры Outline сервера
```

#### 🗄️ models/ - Модели данных
```javascript
// Database.js - Работа с SQLite
- Создание таблиц
- CRUD операции для всех сущностей
- Миграции и управление схемой
```

#### 🔧 services/ - Бизнес-логика
```javascript
// PlanService.js - Управление тарифами
- Форматирование планов
- Расчет скидок
- Валидация тарифов

// PaymentService.js - Платежи
- Создание инвойсов Telegram Stars
- Обработка успешных платежей
- Управление возвратами

// SubscriptionService.js - Подписки
- Создание и активация подписок
- Мониторинг лимитов
- Блокировка при превышении

// OutlineService.js - Outline API
- Создание VPN ключей
- Установка лимитов трафика
- Мониторинг использования
```

#### 🎮 handlers/ - Обработчики
```javascript
// callbackHandler.js - Inline кнопки
- Роутинг callback запросов
- Обработка пользовательских действий
- Навигация по меню
```

#### 🛠️ utils/ - Утилиты
```javascript
// keyboards.js - Клавиатуры
- Генерация inline клавиатур
- Динамические кнопки
- Навигационные элементы
```

## 🏭 Принципы архитектуры

### 1. **Разделение ответственности**
- Каждый класс имеет одну ответственность
- Бизнес-логика отделена от представления
- База данных инкапсулирована в модели

### 2. **Dependency Injection**
```javascript
// Внедрение зависимостей через конструкторы
class SubscriptionService {
    constructor(database, outlineService) {
        this.db = database;
        this.outlineService = outlineService;
    }
}
```

### 3. **Модульность**
- Каждый сервис может быть протестирован изолированно
- Легкая замена компонентов
- Слабая связанность между модулями

### 4. **Конфигурирование**
- Все настройки в переменных окружения
- Константы вынесены в отдельные файлы
- Легкая адаптация под разные среды

## 🗃️ База данных

### Схема таблиц
```sql
users (пользователи)
├── id, telegram_id, username
├── first_name, last_name, role
└── created_at, updated_at

subscriptions (подписки)
├── id, user_id, plan_id
├── outline_key_id, access_url
├── data_limit, data_used, status
├── expires_at, created_at
└── updated_at

payments (платежи)
├── id, user_id, subscription_id
├── plan_id, amount, currency
├── status, telegram_payment_charge_id
└── created_at, updated_at

usage_logs (логи использования)
├── id, subscription_id
├── data_used, logged_at
└── ...
```

### Связи между таблицами
```
users (1) ───── (N) subscriptions
  │                    │
  └── (1) ───── (N) payments
               
subscriptions (1) ───── (N) usage_logs
```

## 🔧 Инструменты разработки

### Makefile команды
```bash
make build     # Сборка Docker образа
make start     # Запуск контейнеров
make logs      # Просмотр логов
make backup    # Создание бэкапа
make deploy    # Полное развертывание
```

### Скрипты автоматизации
- **install.sh** - Полная установка на чистый сервер
- **deploy.sh** - Развертывание обновлений
- **backup.sh** - Автоматические бэкапы
- **monitor.sh** - Мониторинг здоровья системы

## 🚀 Процесс развертывания

### 1. Подготовка
```bash
git clone repo
cd vpnbot
cp .env.example .env
nano .env  # Настройка токенов
```

### 2. Развертывание
```bash
# Автоматически
./install.sh

# Или вручную
make deploy
```

### 3. Мониторинг
```bash
make status   # Статус контейнеров
make logs     # Просмотр логов
make monitor  # Полный мониторинг
```

## 🔄 Жизненный цикл запроса

### Обработка покупки VPN
```
1. Пользователь нажимает "Купить VPN"
2. CallbackHandler.handleShowPlans()
3. PlanService.getAllPlans()
4. KeyboardUtils.createPlansKeyboard()
5. Пользователь выбирает план
6. CallbackHandler.handleCreateInvoice()
7. PaymentService.createInvoice()
8. Telegram отправляет invoice
9. Пользователь оплачивает
10. Bot получает successful_payment
11. SubscriptionService.createSubscription()
12. OutlineService.createSubscriptionKey()
13. Пользователь получает VPN ключ
```

## 📈 Масштабируемость

### Горизонтальное масштабирование
- Несколько экземпляров бота
- Общая база данных
- Load balancer для Webhook'ов

### Вертикальное масштабирование
- Увеличение ресурсов контейнера
- Оптимизация SQL запросов
- Кэширование частых операций

## 🛡️ Безопасность

### Уровень приложения
- Валидация всех входящих данных
- Санитизация пользовательского ввода
- Права доступа по ролям

### Уровень контейнера
- Запуск от непривилегированного пользователя
- Read-only файловая система
- Минимальные capabilities

### Уровень сети
- Закрытые порты (только исходящие соединения)
- HTTPS для всех API вызовов
- Изолированная Docker сеть

Эта архитектура обеспечивает масштабируемость, безопасность и легкость сопровождения проекта. 🚀