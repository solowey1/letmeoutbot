#!/bin/bash

# Скрипт для создания бэкапа базы данных
# Использование: ./scripts/backup.sh

set -e

BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="vpnbot_backup_$DATE.tar.gz"

echo "💾 Создание бэкапа VPN Bot..."

# Создаем директорию для бэкапов
mkdir -p $BACKUP_DIR

# Создаем бэкап базы данных и логов
echo "📦 Архивируем данные..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME" \
    --exclude='node_modules' \
    --exclude='.git' \
    data/ logs/ .env 2>/dev/null || true

# Проверяем размер бэкапа
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)

echo "✅ Бэкап создан: $BACKUP_DIR/$BACKUP_NAME ($BACKUP_SIZE)"

# Удаляем старые бэкапы (оставляем только последние 7)
echo "🧹 Очищаем старые бэкапы..."
find $BACKUP_DIR -name "vpnbot_backup_*.tar.gz" -type f -mtime +7 -delete 2>/dev/null || true

echo "📊 Список бэкапов:"
ls -lh $BACKUP_DIR/vpnbot_backup_*.tar.gz 2>/dev/null || echo "Бэкапов не найдено"