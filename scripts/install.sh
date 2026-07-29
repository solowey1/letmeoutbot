#!/bin/bash

# Автоматический установочный скрипт VPN Bot
# Использование: curl -fsSL https://raw.githubusercontent.com/your-repo/vpnbot/main/install.sh | bash

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Переменные
PROJECT_NAME="vpnbot"
PROJECT_DIR="/opt/$PROJECT_NAME"
REPO_URL="https://github.com/your-username/vpnbot.git"
USE_LOCAL_POSTGRES=false

# Функции для вывода
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Запустите скрипт с правами root: sudo bash install.sh"
        exit 1
    fi
}

# Проверка ОС
check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        log_info "Обнаружена ОС: $OS"
    else
        log_error "Не удалось определить ОС"
        exit 1
    fi
}

# Обновление системы
update_system() {
    log_info "Обновление системы..."
    apt update && apt upgrade -y
    apt install -y curl wget git nano htop openssl
}

# Установка Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker уже установлен"
        return
    fi

    log_info "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh

    # Создание группы docker и добавление пользователя
    groupadd docker || true
    usermod -aG docker root

    # Включение автозапуска
    systemctl enable docker
    systemctl start docker

    log_success "Docker установлен"
    rm -f get-docker.sh
}

# Установка Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose уже установлен"
        return
    fi

    log_info "Установка Docker Compose..."
    DOCKER_COMPOSE_VERSION="1.29.2"
    curl -L "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    log_success "Docker Compose установлен"
}

# Клонирование проекта
clone_project() {
    log_info "Клонирование проекта..."

    if [ -d "$PROJECT_DIR" ]; then
        log_warning "Директория $PROJECT_DIR уже существует. Удаляем..."
        rm -rf "$PROJECT_DIR"
    fi

    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"

    log_success "Проект склонирован в $PROJECT_DIR"
}

# Интерактивная настройка базы данных
configure_database() {
    echo ""
    echo -e "${BLUE}=== Database Configuration ===${NC}"
    echo "Please choose your database type:"
    echo "  1 - SQLite (Local file-based database)"
    echo "  2 - PostgreSQL (Self-hosted or remote)"
    echo "  3 - Supabase (Recommended for production)"
    echo ""

    while true; do
        read -p "Enter your choice (1-3): " db_choice
        case $db_choice in
            1)
                configure_sqlite
                break
                ;;
            2)
                configure_postgres
                break
                ;;
            3)
                configure_supabase
                break
                ;;
            *)
                log_warning "Invalid choice. Please enter 1, 2, or 3."
                ;;
        esac
    done
}

# Настройка SQLite
configure_sqlite() {
    log_info "Configuring SQLite database..."

    DB_TYPE="sqlite"

    read -p "Enter database file path (default: ./database.db): " db_path
    DB_PATH=${db_path:-./database.db}

    # Создаём файл базы данных
    mkdir -p "$(dirname "$PROJECT_DIR/$DB_PATH")"
    touch "$PROJECT_DIR/$DB_PATH"
    chown -R 1001:1001 "$PROJECT_DIR/$(dirname "$DB_PATH")"

    log_success "SQLite database configured at $DB_PATH"
}

# Настройка PostgreSQL
configure_postgres() {
    log_info "Configuring PostgreSQL database..."

    DB_TYPE="postgres"

    echo ""
    echo "Do you want to:"
    echo "  1 - Run PostgreSQL locally in Docker"
    echo "  2 - Connect to a remote PostgreSQL database"
    echo ""

    while true; do
        read -p "Enter your choice (1-2): " pg_choice
        case $pg_choice in
            1)
                configure_postgres_local
                break
                ;;
            2)
                configure_postgres_remote
                break
                ;;
            *)
                log_warning "Invalid choice. Please enter 1 or 2."
                ;;
        esac
    done
}

# Настройка локального PostgreSQL
configure_postgres_local() {
    log_info "Setting up local PostgreSQL in Docker..."

    # Генерируем случайный пароль
    PG_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    PG_USER="vpnbot"
    PG_DB="vpnbot"
    PG_PORT="5432"

    DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@postgres:${PG_PORT}/${PG_DB}"
    POSTGRES_HOST="postgres"
    POSTGRES_PORT="5432"
    POSTGRES_DB="$PG_DB"
    POSTGRES_USER="$PG_USER"
    POSTGRES_PASSWORD="$PG_PASSWORD"

    USE_LOCAL_POSTGRES=true

    log_success "Local PostgreSQL configured"
    log_info "Database credentials generated (will be saved to .env)"
}

# Настройка удалённого PostgreSQL
configure_postgres_remote() {
    log_info "Configuring remote PostgreSQL connection..."

    echo ""
    echo "Please provide your PostgreSQL connection details:"
    echo ""

    read -p "Host (e.g., aws-0-eu-central-1.pooler.supabase.com): " pg_host
    read -p "Port (default: 5432): " pg_port
    pg_port=${pg_port:-5432}
    read -p "Database name: " pg_db
    read -p "Username: " pg_user
    read -p "Password: " pg_password

    DATABASE_URL="postgresql://${pg_user}:${pg_password}@${pg_host}:${pg_port}/${pg_db}"
    POSTGRES_HOST="$pg_host"
    POSTGRES_PORT="$pg_port"
    POSTGRES_DB="$pg_db"
    POSTGRES_USER="$pg_user"
    POSTGRES_PASSWORD="$pg_password"

    USE_LOCAL_POSTGRES=false

    log_success "Remote PostgreSQL configured"
}

# Настройка Supabase
configure_supabase() {
    log_info "Configuring Supabase database..."

    DB_TYPE="supabase"

    echo ""
    echo "Please provide your Supabase credentials:"
    echo "(You can find these in: Supabase Dashboard → Settings → API)"
    echo ""

    read -p "Supabase URL (e.g., https://xxxxx.supabase.co): " supabase_url
    read -p "Supabase API Key (anon/public key): " supabase_key

    SUPABASE_URL="$supabase_url"
    SUPABASE_API_KEY="$supabase_key"

    log_success "Supabase configured"
}

# Создание .env файла с настройками
create_env_file() {
    log_info "Creating .env file..."

    cat > .env << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${telegram_token}
ADMIN_IDS=${admin_ids}

# Database Configuration
DATABASE_TYPE=${DB_TYPE}

EOF

    # Добавляем настройки в зависимости от типа БД
    case $DB_TYPE in
        sqlite)
            cat >> .env << EOF
# SQLite Configuration
DATABASE_PATH=${DB_PATH}

EOF
            ;;
        postgres)
            cat >> .env << EOF
# PostgreSQL Configuration
DATABASE_URL=${DATABASE_URL}
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

EOF
            ;;
        supabase)
            cat >> .env << EOF
# Supabase Configuration
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_API_KEY=${SUPABASE_API_KEY}

EOF
            ;;
    esac

    # Добавляем общие настройки
    cat >> .env << EOF
# Application Settings
NODE_ENV=production
LOG_LEVEL=info
EOF

    log_success ".env file created"
}

# Создание docker-compose для локального PostgreSQL
create_postgres_docker_compose() {
    log_info "Creating docker-compose with local PostgreSQL..."

    cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: vpnbot-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - vpnbot-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  vpnbot:
    build: .
    container_name: vpnbot-prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    env_file:
      - .env
    volumes:
      - vpnbot-data:/app/data
      - vpnbot-logs:/app/logs
    networks:
      - vpnbot-network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Bot is running')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  vpnbot-network:
    driver: bridge

volumes:
  vpnbot-data:
    driver: local
  vpnbot-logs:
    driver: local
  postgres-data:
    driver: local
EOF

    log_success "docker-compose.prod.yml created with PostgreSQL"
}

# Создание базового docker-compose (для SQLite и Supabase)
create_basic_docker_compose() {
    log_info "Creating docker-compose configuration..."

    cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  vpnbot:
    build: .
    container_name: vpnbot-prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    env_file:
      - .env
    volumes:
      - vpnbot-data:/app/data
      - vpnbot-logs:/app/logs
    networks:
      - vpnbot-network
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Bot is running')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  vpnbot-network:
    driver: bridge

volumes:
  vpnbot-data:
    driver: local
  vpnbot-logs:
    driver: local
EOF

    log_success "docker-compose.prod.yml created"
}

# Настройка проекта
setup_project() {
    log_info "Настройка проекта..."

    cd "$PROJECT_DIR"

    # Создание необходимых директорий
    mkdir -p data logs backups

    # Интерактивная настройка базы данных
    configure_database

    # Запрос остальных настроек
    echo ""
    echo -e "${BLUE}=== Bot Configuration ===${NC}"
    echo ""

    read -p "Enter your Telegram Bot Token: " telegram_token
    read -p "Enter Admin Telegram ID(s) (comma-separated): " admin_ids

    # Создание .env файла
    create_env_file

    # Создание docker-compose файла
    if [ "$USE_LOCAL_POSTGRES" = true ]; then
        create_postgres_docker_compose
    else
        create_basic_docker_compose
    fi

    # Установка правильных прав доступа
    chown -R 1001:1001 data logs
    if [ -d scripts ]; then
        chmod +x scripts/*.sh 2>/dev/null || true
    fi

    log_success "Проект настроен"
}

# Настройка файрвола
setup_firewall() {
    log_info "Настройка файрвола..."

    # Установка UFW если не установлен
    apt install -y ufw

    # Сброс правил
    ufw --force reset

    # Базовые правила
    ufw default deny incoming
    ufw default allow outgoing

    # Разрешение SSH
    ufw allow ssh

    # Разрешение исходящих соединений для Docker
    ufw allow out 53    # DNS
    ufw allow out 80    # HTTP
    ufw allow out 443   # HTTPS

    # Включение файрвола
    ufw --force enable

    log_success "Файрвол настроен"
}

# Создание systemd сервиса
create_systemd_service() {
    log_info "Создание systemd сервиса..."

    cat > /etc/systemd/system/vpnbot.service << EOF
[Unit]
Description=VPN Telegram Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable vpnbot

    log_success "Systemd сервис создан"
}

# Настройка логротации
setup_logrotate() {
    log_info "Настройка ротации логов..."

    cat > /etc/logrotate.d/vpnbot << EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

    log_success "Ротация логов настроена"
}

# Настройка cron для бэкапов
setup_cron() {
    log_info "Настройка автоматических бэкапов..."

    # Добавляем задачу в crontab
    (crontab -l 2>/dev/null; echo "0 3 * * * cd $PROJECT_DIR && ./scripts/backup.sh") | crontab -

    log_success "Автоматические бэкапы настроены (ежедневно в 3:00)"
}

# Запуск проекта
start_project() {
    log_info "Запуск VPN Bot..."

    cd "$PROJECT_DIR"

    # Попытка запуска
    if docker-compose -f docker-compose.prod.yml up -d --build; then
        log_success "VPN Bot запущен успешно!"
    else
        log_error "Ошибка запуска VPN Bot"
        return 1
    fi

    # Ожидание запуска
    sleep 10

    # Проверка статуса
    docker-compose -f docker-compose.prod.yml ps
}

# Показ итоговой информации
show_summary() {
    log_success "🎉 Установка VPN Bot завершена!"
    echo ""
    echo "📁 Директория проекта: $PROJECT_DIR"
    echo "⚙️  Файл конфигурации: $PROJECT_DIR/.env"
    echo "🗄️  База данных: $DB_TYPE"
    echo ""
    echo "🔧 Полезные команды:"
    echo "  cd $PROJECT_DIR"
    echo "  docker-compose -f docker-compose.prod.yml ps       # Статус контейнеров"
    echo "  docker-compose -f docker-compose.prod.yml logs -f  # Просмотр логов"
    echo "  docker-compose -f docker-compose.prod.yml restart  # Перезапуск"
    echo ""
    echo "📝 Что нужно сделать дальше:"
    echo "  1. Проверьте логи: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml logs -f"
    echo "  2. Если нужно изменить настройки: nano $PROJECT_DIR/.env"
    echo "  3. После изменений перезапустите: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart"
    echo ""
    echo "🆘 Поддержка: https://github.com/your-username/vpnbot/issues"
}

# Главная функция
main() {
    echo ""
    echo "🤖 VPN Telegram Bot - Автоматическая установка"
    echo "=============================================="
    echo ""

    check_root
    check_os

    log_info "Начинаем установку..."

    update_system
    install_docker
    install_docker_compose
    clone_project
    setup_project
    setup_firewall
    create_systemd_service
    setup_logrotate
    setup_cron
    start_project
    show_summary

    echo ""
    log_success "✅ Установка завершена успешно!"
}

# Обработка ошибок
handle_error() {
    log_error "Произошла ошибка на строке $1"
    echo ""
    echo "🔧 Попробуйте ручную установку:"
    echo "  https://github.com/your-username/vpnbot/blob/main/DEPLOYMENT.md"
    echo ""
    exit 1
}

# Установка обработчика ошибок
trap 'handle_error $LINENO' ERR

# Запуск установки
main "$@"
