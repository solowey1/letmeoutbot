# 🐳 Docker Guide - VPN Telegram Bot

Полное руководство по развертыванию VPN Bot с использованием Docker.

## 🚀 Быстрый старт

### Автоматическая установка (рекомендуется)
```bash
# На чистом Ubuntu сервере
curl -fsSL https://raw.githubusercontent.com/your-repo/vpnbot/main/install.sh | sudo bash
```

### Makefile команды
```bash
make deploy   # Полное развертывание
make start    # Запуск контейнеров  
make stop     # Остановка контейнеров
make restart  # Перезапуск
make logs     # Просмотр логов
make status   # Статус контейнеров
make backup   # Создание бэкапа
make update   # Обновление
make clean    # Очистка старых образов
```

## 📁 Docker файлы

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN addgroup -g 1001 -S nodejs && adduser -S vpnbot -u 1001
COPY src/ ./src/
RUN mkdir -p /app/data && chown -R vpnbot:nodejs /app
USER vpnbot
CMD ["node", "src/index.js"]
```

### docker-compose.prod.yml
```yaml
version: '3.8'
services:
  vpnbot:
    build: .
    container_name: vpnbot-prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/database.db
    env_file:
      - .env
    volumes:
      - vpnbot-data:/app/data
      - vpnbot-logs:/app/logs
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Bot is running')"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## ⚙️ Конфигурация

### Переменные окружения (.env)
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
ADMIN_IDS=123456789,987654321

# Outline Server  
OUTLINE_API_URL=https://your-outline-server:port/api-key

# Database
DATABASE_PATH=/app/data/database.db

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

### Docker Compose профили

#### Разработка
```bash
docker-compose up --build -d
```

#### Продакшн  
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

#### С мониторингом
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  vpnbot:
    # ... основная конфигурация
  
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🔧 Управление контейнерами

### Основные команды
```bash
# Сборка образа
docker-compose -f docker-compose.prod.yml build --no-cache

# Запуск в фоне
docker-compose -f docker-compose.prod.yml up -d

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Остановка
docker-compose -f docker-compose.prod.yml down

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Подключение к контейнеру
docker-compose -f docker-compose.prod.yml exec vpnbot /bin/sh
```

### Управление данными
```bash
# Создание volume для данных
docker volume create vpnbot-data

# Просмотр volumes
docker volume ls

# Инспекция volume
docker volume inspect vpnbot-data

# Бэкап данных
docker run --rm -v vpnbot-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/vpnbot-data-$(date +%Y%m%d).tar.gz -C /data .

# Восстановление данных
docker run --rm -v vpnbot-data:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/vpnbot-data-20231201.tar.gz -C /data
```

## 📊 Мониторинг

### Healthcheck
```bash
# Проверка здоровья контейнера
docker inspect --format='{{.State.Health.Status}}' vpnbot-prod

# Лог healthcheck'ов
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' vpnbot-prod
```

### Метрики ресурсов
```bash
# Использование ресурсов
docker stats vpnbot-prod

# Детальная информация
docker inspect vpnbot-prod

# Логи системы
journalctl -u docker.service -f
```

### Настройка алертов
```yaml
# docker-compose.alerting.yml
version: '3.8'
services:
  alertmanager:
    image: prom/alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
```

## 🔐 Безопасность

### Настройки контейнера
```yaml
services:
  vpnbot:
    security_opt:
      - no-new-privileges:true
    read_only: true
    user: "1001:1001"
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
```

### Secrets управление
```yaml
# docker-compose.secrets.yml
version: '3.8'
services:
  vpnbot:
    secrets:
      - telegram_token
      - outline_api_url
secrets:
  telegram_token:
    file: ./secrets/telegram_token.txt
  outline_api_url:
    file: ./secrets/outline_api_url.txt
```

### Сканирование уязвимостей
```bash
# Сканирование образа
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image vpnbot:latest

# Проверка best practices
docker run --rm -i hadolint/hadolint < Dockerfile
```

## 🌐 Сетевое взаимодействие

### Создание кастомной сети
```yaml
networks:
  vpnbot-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Настройка reverse proxy (Nginx)
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - vpnbot
```

## 📈 Масштабирование

### Горизонтальное масштабирование
```yaml
services:
  vpnbot:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

### Ресурсные лимиты
```yaml
services:
  vpnbot:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## 🔄 CI/CD интеграция

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy VPN Bot
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} '
          cd /opt/vpnbot &&
          git pull origin main &&
          make update
          '
```

### GitLab CI/CD
```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t vpnbot:$CI_COMMIT_SHA .
    - docker tag vpnbot:$CI_COMMIT_SHA vpnbot:latest

deploy:
  stage: deploy
  script:
    - ssh $SERVER_USER@$SERVER_HOST "cd /opt/vpnbot && make update"
```

## 🛠️ Разработка с Docker

### Разработка с hot reload
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  vpnbot-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

### Dockerfile для разработки
```dockerfile
# Dockerfile.dev
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

## 📋 Troubleshooting

### Частые проблемы

#### Контейнер не запускается
```bash
# Проверить логи
docker logs vpnbot-prod

# Проверить конфигурацию
docker-compose -f docker-compose.prod.yml config

# Проверить образ
docker images | grep vpnbot
```

#### Проблемы с правами доступа
```bash
# Исправить права на данные
sudo chown -R 1001:1001 data/ logs/

# Проверить SELinux (если активен)
setsebool -P container_manage_cgroup on
```

#### Проблемы с памятью
```bash
# Увеличить лимиты
docker-compose -f docker-compose.prod.yml up -d --scale vpnbot=1 --memory=1g

# Мониторинг памяти
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

### Диагностические команды
```bash
# Информация о системе Docker
docker system info

# Использование дискового пространства
docker system df

# Очистка неиспользуемых ресурсов
docker system prune -a

# Экспорт/импорт образов
docker save vpnbot:latest | gzip > vpnbot.tar.gz
docker load < vpnbot.tar.gz
```

## 📚 Дополнительные ресурсы

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Telegram Bot API](https://core.telegram.org/bots/api)