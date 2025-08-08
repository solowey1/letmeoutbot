# VPN Bot Makefile

.PHONY: build start stop restart logs status clean backup update monitor help

# Основные команды
build:
	@echo "🔨 Сборка Docker образа..."
	docker-compose -f docker-compose.prod.yml build --no-cache

start:
	@echo "🚀 Запуск VPN Bot..."
	docker-compose -f docker-compose.prod.yml up -d

stop:
	@echo "⏹️  Остановка VPN Bot..."
	docker-compose -f docker-compose.prod.yml down

restart:
	@echo "🔄 Перезапуск VPN Bot..."
	docker-compose -f docker-compose.prod.yml restart

# Мониторинг
logs:
	@echo "📋 Просмотр логов..."
	docker-compose -f docker-compose.prod.yml logs -f

logs-tail:
	@echo "📋 Последние 50 строк логов..."
	docker-compose -f docker-compose.prod.yml logs --tail=50

status:
	@echo "📊 Статус контейнеров..."
	docker-compose -f docker-compose.prod.yml ps

monitor:
	@echo "🔍 Запуск мониторинга..."
	./scripts/monitor.sh

# Управление данными
backup:
	@echo "💾 Создание бэкапа..."
	./scripts/backup.sh

clean:
	@echo "🧹 Очистка неиспользуемых образов..."
	docker image prune -f
	docker volume prune -f

# Развертывание и обновления  
deploy:
	@echo "🚀 Развертывание в продакшн..."
	./scripts/deploy.sh production

update:
	@echo "⬆️  Обновление бота..."
	./scripts/update.sh

# Разработка
dev:
	@echo "🛠️  Запуск в режиме разработки..."
	docker-compose up --build

dev-logs:
	@echo "📋 Логи разработки..."
	docker-compose logs -f

# Утилиты
shell:
	@echo "🐚 Подключение к контейнеру..."
	docker-compose -f docker-compose.prod.yml exec vpnbot /bin/sh

db-backup:
	@echo "💾 Бэкап только базы данных..."
	mkdir -p backups
	cp data/database.db backups/database_$(shell date +%Y%m%d_%H%M%S).db

# Помощь
help:
	@echo "📚 VPN Bot - Доступные команды:"
	@echo ""
	@echo "🚀 Основные команды:"
	@echo "  make build     - Собрать Docker образ"
	@echo "  make start     - Запустить бота"
	@echo "  make stop      - Остановить бота"
	@echo "  make restart   - Перезапустить бота"
	@echo ""
	@echo "📊 Мониторинг:"
	@echo "  make logs      - Просмотр логов в реальном времени"
	@echo "  make logs-tail - Последние 50 строк логов"
	@echo "  make status    - Статус контейнеров"
	@echo "  make monitor   - Полный мониторинг системы"
	@echo ""
	@echo "🛠️  Управление:"
	@echo "  make backup    - Создать бэкап"
	@echo "  make clean     - Очистить неиспользуемые образы"
	@echo "  make update    - Обновить бота"
	@echo "  make deploy    - Развернуть в продакшн"
	@echo ""
	@echo "🧪 Разработка:"
	@echo "  make dev       - Запуск в режиме разработки"
	@echo "  make shell     - Подключиться к контейнеру"
	@echo ""