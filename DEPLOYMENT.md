# 🚀 Развертывание VPN Bot на сервере

Полное руководство по установке и настройке VPN Bot в Docker на сервере.

## 📋 Требования к серверу

- **ОС**: Ubuntu 20.04 LTS или выше (рекомендуется)
- **RAM**: Минимум 512 МБ, рекомендуется 1 ГБ
- **Диск**: Минимум 2 ГБ свободного места
- **Сеть**: Постоянное интернет-соединение
- **Права**: sudo доступ

## 🛠 Быстрая установка (автоматический скрипт)

### 1. Подключитесь к серверу
```bash
ssh root@your-server-ip
```

### 2. Скачайте и запустите установочный скрипт
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/vpnbot/main/scripts/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh production
```

## 🔧 Ручная установка (пошаговая)

### 1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка Docker
```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перелогиньтесь для применения изменений группы
exit
# Подключитесь снова
ssh your-user@your-server-ip
```

### 3. Клонирование проекта
```bash
# Установка git (если не установлен)
sudo apt install git -y

# Клонирование репозитория
git clone https://github.com/your-repo/vpnbot.git
cd vpnbot
```

### 4. Настройка конфигурации
```bash
# Создание .env файла
cp .env.example .env

# Редактирование конфигурации
nano .env
```

**Заполните .env файл:**
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ADMIN_IDS=123456789,987654321

# Outline Server
OUTLINE_API_URL=https://your-outline-server:port/your-api-key

# Database
DATABASE_PATH=/app/data/database.db

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

### 5. Создание необходимых директорий
```bash
mkdir -p data logs backups
```

### 6. Запуск бота
```bash
# Сборка и запуск
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔐 Настройка Telegram Bot

### 1. Создание бота в @BotFather
```
/newbot
Выберите имя: VPN Premium Bot
Выберите username: your_vpn_bot
```

### 2. Включение платежей
```
/mybots
Выберите вашего бота
Payments → Enable
```

### 3. Настройка команд
```
/mybots
Выберите вашего бота
Edit Commands
```

Добавьте команды:
```
start - Начать работу с ботом
help - Помощь и информация
admin - Административная панель (только для админов)
```

## ⚙️ Настройка Outline сервера

### 1. Установка Outline Manager
- Скачайте с [официального сайта](https://getoutline.org/get-started/#step-1)
- Создайте новый сервер или подключитесь к существующему

### 2. Получение API URL
1. В Outline Manager откройте настройки сервера
2. Найдите "Management API URL"  
3. Скопируйте полный URL (например: `https://123.456.789.0:12345/abc123def456`)

## 📊 Мониторинг и управление

### Полезные команды
```bash
# Просмотр логов в реальном времени
docker-compose -f docker-compose.prod.yml logs -f

# Просмотр статуса контейнеров
docker-compose -f docker-compose.prod.yml ps

# Перезапуск бота
docker-compose -f docker-compose.prod.yml restart

# Остановка бота
docker-compose -f docker-compose.prod.yml down

# Обновление бота (при наличии изменений)
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Скрипты для управления
```bash
# Мониторинг системы
./scripts/monitor.sh

# Создание бэкапа
./scripts/backup.sh

# Обновление бота
./scripts/update.sh
```

## 🛡️ Безопасность

### Настройка файрвола (UFW)
```bash
# Включение UFW
sudo ufw enable

# Разрешение SSH
sudo ufw allow ssh

# Разрешение только нужных портов (если используете веб-интерфейс)
# sudo ufw allow 80
# sudo ufw allow 443

# Проверка статуса
sudo ufw status
```

### Настройка автоматических обновлений безопасности
```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Регулярные бэкапы
Добавьте в crontab:
```bash
crontab -e

# Добавьте строку для ежедневного бэкапа в 3:00
0 3 * * * /path/to/vpnbot/scripts/backup.sh
```

## 🔄 Обновление бота

### Автоматическое обновление
```bash
cd /path/to/vpnbot
./scripts/update.sh
```

### Ручное обновление
```bash
# 1. Остановка контейнеров
docker-compose -f docker-compose.prod.yml down

# 2. Обновление кода
git pull origin main

# 3. Пересборка и запуск
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📈 Настройка системного мониторинга

### Установка Prometheus и Grafana (опционально)
```bash
# Создание docker-compose файла для мониторинга
cat > docker-compose.monitoring.yml << EOF
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
EOF
```

## ❗ Устранение проблем

### Проблема: Контейнер не запускается
```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs

# Проверьте синтаксис .env файла
cat .env

# Проверьте права доступа
ls -la data/ logs/
```

### Проблема: Бот не отвечает
```bash
# Проверьте статус контейнера
docker-compose -f docker-compose.prod.yml ps

# Проверьте логи на ошибки
docker-compose -f docker-compose.prod.yml logs | grep -i error

# Перезапустите бота
docker-compose -f docker-compose.prod.yml restart
```

### Проблема: Ошибки с базой данных
```bash
# Проверьте права доступа к data/
sudo chown -R 1001:1001 data/

# Создайте бэкап и пересоздайте БД
./scripts/backup.sh
rm data/database.db
docker-compose -f docker-compose.prod.yml restart
```

### Проблема: Не работают платежи
1. Убедитесь что платежи включены в @BotFather
2. Проверьте правильность TELEGRAM_BOT_TOKEN
3. Убедитесь что Telegram Stars доступны в вашем регионе

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте логи**: `docker-compose -f docker-compose.prod.yml logs`
2. **Запустите мониторинг**: `./scripts/monitor.sh`
3. **Создайте бэкап**: `./scripts/backup.sh`
4. **Обратитесь к администратору** через бота или по email

---

## 🎯 Быстрый чек-лист установки

- [ ] Сервер обновлен
- [ ] Docker установлен
- [ ] Проект склонирован  
- [ ] .env файл настроен
- [ ] Telegram бот создан и настроен
- [ ] Outline сервер настроен и API URL получен
- [ ] Бот запущен и работает
- [ ] Платежи тестируются
- [ ] Мониторинг настроен
- [ ] Бэкапы настроены

**Время установки: 15-30 минут** ⏱️