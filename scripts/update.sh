#!/bin/bash

# Скрипт для обновления VPN Bot
# Использование: ./scripts/update.sh

set -e

PROJECT_NAME="vpnbot"

# Определяем compose-файл
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo "❌ Не найден docker-compose файл"
    exit 1
fi

echo "🔄 Обновление $PROJECT_NAME (compose: $COMPOSE_FILE)..."

# Получаем обновления из git
echo "📥 Загружаем обновления..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git pull origin "$BRANCH"

# Останавливаем контейнеры
echo "⏹️  Останавливаем контейнеры..."
docker-compose -f "$COMPOSE_FILE" down

# Пересобираем образ
echo "🔨 Пересобираем Docker образ..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Запускаем контейнеры
echo "🚀 Запускаем обновленные контейнеры..."
docker-compose -f "$COMPOSE_FILE" up -d

# Очищаем неиспользуемые образы
echo "🧹 Очищаем старые образы..."
docker image prune -f

# Проверяем статус
echo "🔍 Проверяем статус..."
sleep 5
docker-compose -f "$COMPOSE_FILE" ps

echo "✅ Обновление завершено!"