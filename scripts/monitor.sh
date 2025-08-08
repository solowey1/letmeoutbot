#!/bin/bash

# Скрипт для мониторинга VPN Bot
# Использование: ./scripts/monitor.sh

set -e

PROJECT_NAME="vpnbot-prod"

echo "📊 Мониторинг VPN Bot"
echo "====================="

# Проверяем статус контейнера
echo "🔍 Статус контейнера:"
docker-compose -f docker-compose.prod.yml ps

echo ""

# Показываем использование ресурсов
echo "💻 Использование ресурсов:"
docker stats $PROJECT_NAME --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

echo ""

# Проверяем логи на ошибки
echo "⚠️  Последние ошибки:"
docker-compose -f docker-compose.prod.yml logs --tail=50 | grep -i error || echo "Ошибок не найдено"

echo ""

# Показываем размер базы данных
echo "💾 Размер базы данных:"
if [ -f "data/database.db" ]; then
    du -h data/database.db
else
    echo "База данных не найдена"
fi

echo ""

# Показываем размер логов
echo "📋 Размер логов:"
if [ -d "logs" ]; then
    du -sh logs/
else
    echo "Директория логов не найдена"
fi

echo ""

# Проверяем доступность Telegram API
echo "🌐 Проверяем доступность Telegram API..."
if curl -s https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe > /dev/null 2>&1; then
    echo "✅ Telegram API доступен"
else
    echo "❌ Telegram API недоступен или неверный токен"
fi

echo ""

# Показываем последние 10 строк логов
echo "📋 Последние логи:"
docker-compose -f docker-compose.prod.yml logs --tail=10