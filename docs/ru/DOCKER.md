# Docker Deployment

Это руководство объясняет, как запустить VPN бот и Support бот через Docker.

## Структура

Проект содержит два бота, которые запускаются в отдельных контейнерах:

1. **vpnbot** - основной бот для продажи VPN ключей
2. **support-bot** - бот поддержки для общения с пользователями

Оба бота используют одну и ту же базу данных и работают параллельно.

## Быстрый старт

### Разработка

```bash
# 1. Скопируйте .env.example в .env и заполните переменные
cp .env.example .env

# 2. Запустите оба бота
docker-compose up -d

# 3. Просмотр логов
docker-compose logs -f

# Просмотр логов конкретного бота
docker-compose logs -f vpnbot
docker-compose logs -f support-bot
```

### Продакшен

```bash
# 1. Настройте .env файл
cp .env.example .env
# Отредактируйте .env и установите:
# - TELEGRAM_BOT_TOKEN
# - SUPPORT_BOT_TOKEN
# - ADMIN_IDS
# - DATABASE_TYPE=supabase (рекомендуется)
# - SUPABASE_URL и SUPABASE_API_KEY

# 2. Запустите в продакшене
docker-compose -f docker-compose.prod.yml up -d

# 3. Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# 4. Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f
```

## Управление контейнерами

### Запуск

```bash
# Разработка
docker-compose up -d

# Продакшен
docker-compose -f docker-compose.prod.yml up -d
```

### Остановка

```bash
# Остановить все контейнеры
docker-compose down

# Остановить один контейнер
docker-compose stop vpnbot
docker-compose stop support-bot
```

### Перезапуск

```bash
# Перезапустить все
docker-compose restart

# Перезапустить один контейнер
docker-compose restart vpnbot
docker-compose restart support-bot
```

### Пересборка

```bash
# Пересобрать образы (после изменения кода)
docker-compose build

# Пересобрать и запустить
docker-compose up -d --build
```

## Мониторинг

### Просмотр логов

```bash
# Все контейнеры
docker-compose logs -f

# Только VPN бот
docker-compose logs -f vpnbot

# Только Support бот
docker-compose logs -f support-bot

# Последние 100 строк
docker-compose logs --tail=100 vpnbot
```

### Статус контейнеров

```bash
# Список запущенных контейнеров
docker-compose ps

# Детальная информация
docker-compose ps -a

# Статистика использования ресурсов
docker stats vpnbot-prod support-bot-prod
```

### Health Checks

Оба контейнера имеют встроенные health checks:

```bash
# Проверка здоровья
docker inspect --format='{{.State.Health.Status}}' vpnbot-prod
docker inspect --format='{{.State.Health.Status}}' support-bot-prod
```

## Volumes (Данные)

### Разработка

В режиме разработки используются bind mounts:
- `./data` → `/app/data` (база данных SQLite)
- `./logs` → `/app/logs` (логи)
- `./src` → `/app/src` (hot reload кода)

### Продакшен

В продакшене используются Docker volumes:
- `vpnbot-data` - хранит базу данных
- `vpnbot-logs` - хранит логи

```bash
# Список volumes
docker volume ls | grep vpnbot

# Просмотр информации о volume
docker volume inspect vpnbot-data

# Резервное копирование данных
docker run --rm -v vpnbot-data:/data -v $(pwd):/backup alpine tar czf /backup/vpnbot-backup.tar.gz /data

# Восстановление данных
docker run --rm -v vpnbot-data:/data -v $(pwd):/backup alpine tar xzf /backup/vpnbot-backup.tar.gz -C /
```

## Переменные окружения

### Обязательные

```env
TELEGRAM_BOT_TOKEN=your_main_bot_token
SUPPORT_BOT_TOKEN=your_support_bot_token
ADMIN_IDS=123456789,987654321
```

### База данных

```env
# Рекомендуется для продакшена
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_API_KEY=your_api_key

# Или PostgreSQL
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:5432/database

# Или SQLite (только для разработки)
DATABASE_TYPE=sqlite
DATABASE_PATH=/app/data/database.db
```

### Outline VPN

```env
OUTLINE_API_URL=https://your-server:port/your-api-key
```

## Troubleshooting

### Контейнер не запускается

```bash
# Проверить логи
docker-compose logs vpnbot
docker-compose logs support-bot

# Проверить конфигурацию
docker-compose config

# Пересобрать с нуля
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Проблемы с базой данных

```bash
# Проверить volumes
docker volume ls

# Войти в контейнер
docker exec -it vpnbot-prod sh

# Проверить файлы
ls -la /app/data/
```

### Бот не отвечает

```bash
# Проверить, запущен ли контейнер
docker-compose ps

# Проверить логи на ошибки
docker-compose logs --tail=100 vpnbot

# Проверить переменные окружения
docker exec vpnbot-prod env | grep TELEGRAM_BOT_TOKEN
```

### Очистка

```bash
# Удалить все контейнеры и volumes
docker-compose down -v

# Удалить неиспользуемые образы
docker image prune -a

# Полная очистка Docker
docker system prune -a --volumes
```

## Обновление

```bash
# 1. Остановить контейнеры
docker-compose down

# 2. Обновить код
git pull

# 3. Пересобрать образы
docker-compose build

# 4. Запустить
docker-compose up -d

# 5. Проверить логи
docker-compose logs -f
```

## Production Best Practices

1. **Используйте Supabase/PostgreSQL** вместо SQLite
2. **Настройте логирование** в внешний сервис (Loki, ELK)
3. **Мониторинг** через Prometheus + Grafana
4. **Backup** базы данных регулярно
5. **Ограничьте ресурсы** контейнеров:

```yaml
services:
  vpnbot:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

6. **Используйте secrets** для токенов:

```yaml
secrets:
  telegram_token:
    file: ./secrets/telegram_token.txt
```

## Мониторинг через Prometheus (опционально)

Добавьте в `docker-compose.prod.yml`:

```yaml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
```

## Поддержка

Если возникли проблемы:

1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте health: `docker inspect`
4. Создайте issue на GitHub
