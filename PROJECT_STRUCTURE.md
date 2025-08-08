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
        ├── 🚀 index.js                    # Минимальная точка входа (3 строки!)
        │
        ├── 🤖 bot/                        # Основной класс бота
        │   └── VPNBot.js                  # Центральный компонент со всей логикой
        │
        ├── ⚙️ config/                     # Конфигурация
        │   ├── constants.js               # Константы, тарифы, уведомления
        │   └── database.js                # Настройки БД и приложения
        │
        ├── 🗄️ models/                     # Модели данных
        │   └── Database.js                # SQLite + таблица notifications
        │
        ├── 🔧 services/                   # Модульные сервисы
        │   ├── NotificationService.js     # 🆕 Сервис уведомлений
        │   ├── PlanService.js             # Тарифы + локализация (plural)
        │   ├── PaymentService.js          # Обработка платежей Stars
        │   ├── SubscriptionService.js     # Подписки + мониторинг лимитов
        │   └── OutlineService.js          # Outline API + retry механизм
        │
        ├── 🎮 handlers/                   # Обработчики событий
        │   └── callbackHandler.js         # Обработка inline кнопок
        │
        └── 🛠️ utils/                      # Утилиты
            └── keyboards.js               # Создание inline клавиатур
```


### 📐 Паттерн Service-Oriented Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VPNBot        │    │    Services     │    │     Models      │
│ (Orchestrator)  │───►│  (Specialized)  │───►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Event Handlers         Business Logic          Data Storage
  (CallbackHandler)      (5 специальных          (SQLite + 
                          сервиса)               notifications)
```

### 🔄 Поток обработки уведомлений
```
CRON (каждые 30 мин)
     │
     ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ SubscriptionSvc │───►│ NotificationSvc  │───►│ Telegram User   │
│ (monitoring)    │    │ (smart alerts)   │    │ (receives msg)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
     ▲                           │
     │                           ▼
┌─────────────────┐    ┌──────────────────┐
│   OutlineAPI    │    │    Database      │
│ (usage stats)   │    │ (anti-spam)      │
└─────────────────┘    └──────────────────┘
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

#### 📋 index.js - Минимальная точка входа
- Всего 3 строки кода
- Импорт и запуск VPNBot класса
- Вся логика вынесена в VPNBot.js

###### ⚙️ config/ - Конфигурация
```javascript
// constants.js - Все константы проекта
- PLANS: Тарифные планы с ценами (включая TEST план для админов)
- SUBSCRIPTION_STATUS: Статусы подписок
- PAYMENT_STATUS: Статусы платежей
- NOTIFICATION_TYPES: 🆕 6 типов уведомлений
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
// NotificationService.js - 🆕 Уведомления
- 6 типов уведомлений (трафик 5%, 1%, время 3 дня, 1 день + исчерпание)
- Защита от спама (7 дней)
- Админ уведомления
- Массовые рассылки

// PlanService.js - Тарифы + локализация
- Форматирование планов с русской pluralization
- Отображение в МБ для значений <1ГБ
- Фильтрация тестовых планов для админов

// PaymentService.js - Платежи
- Создание инвойсов Telegram Stars
- Обработка успешных платежей с retry логикой
- Управление возвратами

// SubscriptionService.js - Подписки + мониторинг
- Создание и активация подписок
- Автоматический мониторинг лимитов (каждые 30 мин)
- Система threshold уведомлений
- Блокировка при превышении

// OutlineService.js - Outline API + retry
- Создание VPN ключей с retry механизмом (3 попытки)
- Установка лимитов трафика
- Мониторинг использования в реальном времени
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

notifications (🆕 уведомления)
├── id, user_id, subscription_id
├── type, sent_at
└── ... (защита от спама)
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