#!/bin/bash

# Скрипт для обновления VPN Bot
# Использование: ./scripts/update.sh

set -e

PROJECT_NAME="vpnbot"

echo "🔄 Обновление $PROJECT_NAME..."

# Получаем обновления из git
echo "📥 Загружаем обновления..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git pull origin "$BRANCH"

# Останавливаем контейнеры
echo "⏹️  Останавливаем контейнеры..."
docker-compose -f docker-compose.prod.yml down

# Пересобираем образ
echo "🔨 Пересобираем Docker образ..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Запускаем контейнеры
echo "🚀 Запускаем обновленные контейнеры..."
docker-compose -f docker-compose.prod.yml up -d

# Очищаем неиспользуемые образы
echo "🧹 Очищаем старые образы..."
docker image prune -f

# Проверяем статус
echo "🔍 Проверяем статус..."
sleep 5
docker-compose -f docker-compose.prod.yml ps

echo "✅ Обновление завершено!"