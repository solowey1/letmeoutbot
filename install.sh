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
    apt install -y curl wget git nano htop
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

# Настройка проекта
setup_project() {
    log_info "Настройка проекта..."
    
    cd "$PROJECT_DIR"
    
    # Создание .env файла
    if [ ! -f .env ]; then
        cp .env.example .env
        log_info ".env файл создан из шаблона"
    fi
    
    # Создание необходимых директорий
    mkdir -p data logs backups
    
    # Установка правильных прав доступа
    chown -R 1001:1001 data logs
    chmod +x scripts/*.sh
    
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

# Проверка конфигурации
check_config() {
    log_info "Проверка конфигурации..."
    
    cd "$PROJECT_DIR"
    
    if [ ! -f .env ]; then
        log_error ".env файл не найден"
        return 1
    fi
    
    # Проверка обязательных переменных
    required_vars=("TELEGRAM_BOT_TOKEN" "OUTLINE_API_URL")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env || grep -q "^${var}=.*_here" .env; then
            log_warning "Переменная $var не настроена в .env файле"
        fi
    done
    
    log_info "Отредактируйте .env файл: nano $PROJECT_DIR/.env"
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
    echo ""
    echo "🔧 Полезные команды:"
    echo "  cd $PROJECT_DIR"
    echo "  make status     # Статус контейнеров"
    echo "  make logs       # Просмотр логов"
    echo "  make restart    # Перезапуск"
    echo "  make backup     # Создание бэкапа"
    echo ""
    echo "📝 Что нужно сделать дальше:"
    echo "  1. Отредактируйте .env файл: nano $PROJECT_DIR/.env"
    echo "  2. Перезапустите бота: cd $PROJECT_DIR && make restart"
    echo "  3. Проверьте логи: cd $PROJECT_DIR && make logs"
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
    check_config
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