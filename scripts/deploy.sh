#!/bin/bash

# Скрипт для развертывания VPN Bot на сервере
# Использование: ./scripts/deploy.sh [production|staging]

set -e

ENV=${1:-production}
PROJECT_NAME="vpnbot"

echo "🚀 Развертывание $PROJECT_NAME в окружении: $ENV"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker установлен. Перелогиньтесь для применения изменений."
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаем..."
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "📝 Создайте .env файл на основе .env.example"
    echo "cp .env.example .env"
    echo "nano .env"
    exit 1
fi

# Создаем необходимые директории
echo "📁 Создаем директории..."
mkdir -p data logs

# Останавливаем существующие контейнеры
echo "⏹️  Останавливаем существующие контейнеры..."
docker-compose -f docker-compose.prod.yml down || true

# Собираем образ
echo "🔨 Собираем Docker образ..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Запускаем контейнеры
echo "🚀 Запускаем контейнеры..."
if [ "$ENV" = "production" ]; then
    docker-compose -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

# Проверяем статус
echo "🔍 Проверяем статус контейнеров..."
sleep 5
docker-compose -f docker-compose.prod.yml ps

# Показываем логи
echo "📋 Последние логи:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "📊 Полезные команды:"
echo "  Логи:           docker-compose -f docker-compose.prod.yml logs -f"
echo "  Статус:         docker-compose -f docker-compose.prod.yml ps"
echo "  Перезапуск:     docker-compose -f docker-compose.prod.yml restart"
echo "  Остановка:      docker-compose -f docker-compose.prod.yml down"
echo "  Обновление:     ./scripts/update.sh"