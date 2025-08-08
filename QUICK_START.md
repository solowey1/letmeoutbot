# ⚡ Быстрый старт - VPN Bot

Развертывание за 5 минут на любом VPS!

## 🚀 Один скрипт = готовый бот

### 1. Подключитесь к серверу
```bash
ssh root@your-server-ip
```

### 2. Запустите автоматическую установку
```bash
wget -O - https://raw.githubusercontent.com/your-username/vpnbot/main/install.sh | bash
```

### 3. Настройте .env файл
```bash
nano /opt/vpnbot/.env
```

Заполните обязательные поля:
```env
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
OUTLINE_API_URL=https://ваш-outline-сервер:порт/api-key
ADMIN_IDS=ваш_telegram_id
```

### 4. Перезапустите бота
```bash
cd /opt/vpnbot
make restart
```

## ✅ Готово! Бот работает!

---

## 📋 Пошаговая инструкция (если автоскрипт недоступен)

### 1. Установка Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Клонирование проекта
```bash
git clone https://github.com/your-username/vpnbot.git /opt/vpnbot
cd /opt/vpnbot
```

### 3. Настройка
```bash
cp .env.example .env
nano .env  # Заполните токены
```

### 4. Запуск
```bash
make deploy
```

---

## 🎯 Настройка Telegram бота

### В @BotFather:
1. `/newbot` - создать бота
2. `/mybots` → выберите бота → `Payments` → включить
3. Скопируйте токен в `.env`

### Получите ваш Telegram ID:
1. Напишите [@userinfobot](https://t.me/userinfobot)
2. Скопируйте ID в `ADMIN_IDS`

---

## 🖥️ Настройка Outline сервера

1. Скачайте [Outline Manager](https://getoutline.org/)
2. Создайте сервер
3. В настройках найдите "Management API URL"
4. Скопируйте в `OUTLINE_API_URL`

---

## 📊 Проверка работы

```bash
# Статус бота
make status

# Логи в реальном времени  
make logs

# Мониторинг системы
make monitor
```

---

## ⚙️ Основные команды

```bash
make start     # Запуск
make stop      # Остановка  
make restart   # Перезапуск
make logs      # Просмотр логов
make backup    # Создание бэкапа
make update    # Обновление
```

---

## 🆘 Проблемы?

### Бот не отвечает:
```bash
make logs | grep ERROR
```

### Проблемы с платежами:
- Проверьте что платежи включены в @BotFather
- Telegram Stars доступны не во всех регионах

### Outline API недоступен:
```bash
curl -k https://ваш-сервер:порт/access-keys
```

---

## 📱 Тестирование

1. Запустите бота в Telegram
2. Нажмите `/start`
3. Попробуйте купить тестовый тариф
4. Проверьте создание VPN ключа

---

**⏱️ Время установки: 5-10 минут**

**💰 Стоимость VPS: от $5/месяц**

**👥 Поддерживаемых пользователей: 1000+**