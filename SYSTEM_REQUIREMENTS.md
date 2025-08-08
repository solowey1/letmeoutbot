# 🖥️ Системные требования

## 📊 Минимальные требования

### Сервер
- **ОС**: Linux (Ubuntu 20.04+ рекомендуется)
- **RAM**: 512 МБ (рекомендуется 1 ГБ)
- **CPU**: 1 ядро (рекомендуется 2 ядра)
- **Диск**: 2 ГБ свободного места
- **Сеть**: Стабильное интернет-соединение

### Программное обеспечение
- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **Git**: для обновлений

## 🎯 Рекомендуемые требования

### Для продакшн среды
- **ОС**: Ubuntu 22.04 LTS
- **RAM**: 2 ГБ
- **CPU**: 2 ядра
- **Диск**: 10 ГБ SSD
- **Сеть**: 100 Мбит/с

### Дополнительно
- **Backup хранилище**: 5 ГБ для бэкапов
- **Мониторинг**: Prometheus/Grafana (опционально)

## 🏗️ Архитектура развертывания

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram      │    │   VPN Bot       │    │  Outline Server │
│     API         │◄──►│   (Docker)      │◄──►│     API         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   SQLite DB     │
                       │   (Volume)      │
                       └─────────────────┘
```

## 📦 Использование ресурсов

### В режиме простоя
- **RAM**: ~50-100 МБ
- **CPU**: <1%
- **Диск**: 100-500 МБ (база данных)

### При активной нагрузке (100 пользователей)
- **RAM**: ~200-400 МБ  
- **CPU**: 5-15%
- **Диск**: 1-5 ГБ (база данных + логи)

### Пиковая нагрузка (1000+ пользователей)
- **RAM**: ~500 МБ - 1 ГБ
- **CPU**: 20-50%
- **Диск**: 5-20 ГБ

## 🔧 Конфигурация Docker

### Лимиты ресурсов
```yaml
services:
  vpnbot:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Мониторинг здоровья
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "console.log('Bot is running')"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## 🌐 Сетевые требования

### Исходящие соединения
- **Telegram API**: api.telegram.org:443 (HTTPS)
- **Outline Server**: ваш-сервер:порт (HTTPS)
- **Docker Hub**: registry.docker.com:443 (для образов)

### Входящие соединения
- Не требуются (бот работает по Webhook или Long Polling)

## 📈 Масштабирование

### Горизонтальное масштабирование
```bash
# Увеличение количества реплик
docker-compose -f docker-compose.prod.yml up --scale vpnbot=3 -d
```

### Вертикальное масштабирование
```bash
# Увеличение лимитов ресурсов
docker-compose -f docker-compose.prod.yml up -d --scale vpnbot=1 --memory=1g
```

## ☁️ Облачные провайдеры

### Рекомендуемые VPS
- **DigitalOcean**: Droplet Basic ($6/месяц)
- **Linode**: Nanode 1GB ($5/месяц)
- **Vultr**: Regular Performance ($6/месяц)
- **Hetzner**: CX11 (€3.29/месяц)

### AWS
- **Instance**: t3.micro (Free tier)
- **Storage**: 8 ГБ gp3 EBS
- **Network**: 1 ГБ/месяц (Free tier)

### Google Cloud
- **Instance**: e2-micro (Free tier)
- **Storage**: 30 ГБ Standard disk
- **Network**: 1 ГБ/месяц (Free tier)

## 🔐 Безопасность

### Файрвол (UFW)
```bash
sudo ufw allow ssh
sudo ufw allow out 53
sudo ufw allow out 80
sudo ufw allow out 443
sudo ufw enable
```

### Docker Security
```yaml
services:
  vpnbot:
    security_opt:
      - no-new-privileges:true
    read_only: true
    user: "1001:1001"
```

## 📊 Мониторинг производительности

### Метрики для отслеживания
- Использование RAM/CPU контейнера
- Размер базы данных
- Количество активных пользователей
- Время ответа Telegram API
- Ошибки в логах

### Алерты
- RAM > 80%
- CPU > 90% в течение 5 минут
- Размер БД > 1 ГБ
- Ошибки > 10 в минуту

## 🔧 Настройка для разных нагрузок

### Малая нагрузка (<100 пользователей)
```yaml
# docker-compose.yml
services:
  vpnbot:
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
```

### Средняя нагрузка (100-1000 пользователей)
```yaml
services:
  vpnbot:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### Высокая нагрузка (>1000 пользователей)
```yaml
services:
  vpnbot:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'
      replicas: 2
```