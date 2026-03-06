#!/bin/bash

# =============================================================
# manage.sh — единый скрипт управления VPN Bot
# =============================================================
# Использование: ./manage.sh <команда> [аргументы]
# =============================================================

set -e

SCRIPTS_DIR="$(cd "$(dirname "$0")/scripts" && pwd)"
# Определяем compose-файл
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_PROD="docker-compose.prod.yml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_PROD="docker-compose.yml"
else
    COMPOSE_PROD=""
fi
COMPOSE_DEV="docker-compose.yml"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }

header() {
    echo ""
    echo -e "${CYAN}===========================${NC}"
    echo -e "${CYAN}  VPN Bot — $1${NC}"
    echo -e "${CYAN}===========================${NC}"
    echo ""
}

# -----------------------------------------------------------
# start [dev|prod]
# -----------------------------------------------------------
cmd_start() {
    local mode=${1:-dev}
    header "Запуск ($mode)"

    if [ ! -f .env ]; then
        error ".env не найден. Запустите: ./manage.sh install"
        exit 1
    fi

    if [ "$mode" = "prod" ]; then
        if [ ! -f "$COMPOSE_PROD" ]; then
            error "Файл $COMPOSE_PROD не найден."
            exit 1
        fi
        info "Запуск в production режиме..."
        docker-compose -f "$COMPOSE_PROD" up -d
        success "Бот запущен (production)"
        docker-compose -f "$COMPOSE_PROD" ps
    else
        if [ ! -d node_modules ]; then
            info "Устанавливаем зависимости..."
            npm install
        fi
        info "Запуск в dev режиме..."
        npm run dev
    fi
}

# -----------------------------------------------------------
# stop
# -----------------------------------------------------------
cmd_stop() {
    header "Остановка"
    if [ -f "$COMPOSE_PROD" ]; then
        docker-compose -f "$COMPOSE_PROD" down
        success "Контейнеры остановлены"
    else
        warn "Файл $COMPOSE_PROD не найден"
    fi
}

# -----------------------------------------------------------
# restart
# -----------------------------------------------------------
cmd_restart() {
    header "Перезапуск"
    if [ -f "$COMPOSE_PROD" ]; then
        docker-compose -f "$COMPOSE_PROD" restart
        success "Бот перезапущен"
        docker-compose -f "$COMPOSE_PROD" ps
    else
        warn "Файл $COMPOSE_PROD не найден"
    fi
}

# -----------------------------------------------------------
# deploy [production|staging]
# -----------------------------------------------------------
cmd_deploy() {
    header "Деплой"
    bash "$SCRIPTS_DIR/deploy.sh" "$@"
}

# -----------------------------------------------------------
# update — git pull + пересборка + запуск
# -----------------------------------------------------------
cmd_update() {
    header "Обновление"
    bash "$SCRIPTS_DIR/update.sh"
}

# -----------------------------------------------------------
# full-update — бэкап + git pull + пересборка + запуск
# -----------------------------------------------------------
cmd_full_update() {
    header "Полное обновление"
    info "Шаг 1/2: Создание бэкапа перед обновлением..."
    bash "$SCRIPTS_DIR/backup.sh"
    echo ""
    info "Шаг 2/2: Обновление приложения..."
    bash "$SCRIPTS_DIR/update.sh"
    success "Полное обновление завершено"
}

# -----------------------------------------------------------
# backup
# -----------------------------------------------------------
cmd_backup() {
    header "Бэкап"
    bash "$SCRIPTS_DIR/backup.sh"
}

# -----------------------------------------------------------
# logs [--tail N]
# -----------------------------------------------------------
cmd_logs() {
    local tail=${1:-50}
    if [ -f "$COMPOSE_PROD" ]; then
        docker-compose -f "$COMPOSE_PROD" logs --tail="$tail" -f
    else
        warn "Файл $COMPOSE_PROD не найден"
    fi
}

# -----------------------------------------------------------
# status
# -----------------------------------------------------------
cmd_status() {
    header "Статус"
    if [ -f "$COMPOSE_PROD" ]; then
        docker-compose -f "$COMPOSE_PROD" ps
    else
        warn "Файл $COMPOSE_PROD не найден"
    fi
}

# -----------------------------------------------------------
# monitor
# -----------------------------------------------------------
cmd_monitor() {
    header "Мониторинг"
    bash "$SCRIPTS_DIR/monitor.sh"
}

# -----------------------------------------------------------
# check — проверка конфигурации и зависимостей
# -----------------------------------------------------------
cmd_check() {
    header "Проверка"
    bash "$SCRIPTS_DIR/check.sh"
}

# -----------------------------------------------------------
# db-init — инициализация базы данных
# -----------------------------------------------------------
cmd_db_init() {
    header "Инициализация БД"
    bash "$SCRIPTS_DIR/db-init.sh"
}

# -----------------------------------------------------------
# install — первичная установка на сервер (root)
# -----------------------------------------------------------
cmd_install() {
    header "Установка"
    bash "$SCRIPTS_DIR/install.sh"
}

# -----------------------------------------------------------
# help
# -----------------------------------------------------------
cmd_help() {
    echo ""
    echo -e "${CYAN}VPN Bot — управление приложением${NC}"
    echo ""
    echo -e "${YELLOW}Использование:${NC}"
    echo "  ./manage.sh <команда> [аргументы]"
    echo ""
    echo -e "${YELLOW}Команды:${NC}"
    echo -e "  ${GREEN}start [dev|prod]${NC}   Запустить бот (dev по умолчанию)"
    echo -e "  ${GREEN}stop${NC}               Остановить контейнеры"
    echo -e "  ${GREEN}restart${NC}            Перезапустить бот"
    echo ""
    echo -e "  ${GREEN}deploy [env]${NC}       Полный деплой (production/staging)"
    echo -e "  ${GREEN}update${NC}             Git pull + пересборка + запуск"
    echo -e "  ${GREEN}full-update${NC}        Бэкап + update (безопасное обновление)"
    echo ""
    echo -e "  ${GREEN}backup${NC}             Создать бэкап данных"
    echo -e "  ${GREEN}logs [N]${NC}           Показать последние N строк логов (50 по умолч.)"
    echo -e "  ${GREEN}status${NC}             Статус контейнеров"
    echo -e "  ${GREEN}monitor${NC}            Полный мониторинг (ресурсы, ошибки, логи)"
    echo ""
    echo -e "  ${GREEN}check${NC}              Проверить конфигурацию и зависимости"
    echo -e "  ${GREEN}db-init${NC}            Инициализировать базу данных"
    echo -e "  ${GREEN}install${NC}            Первичная установка на сервер (нужен root)"
    echo ""
    echo -e "  ${GREEN}help${NC}               Показать эту справку"
    echo ""
    echo -e "${YELLOW}Примеры:${NC}"
    echo "  ./manage.sh start dev"
    echo "  ./manage.sh start prod"
    echo "  ./manage.sh full-update"
    echo "  ./manage.sh logs 100"
    echo "  ./manage.sh deploy production"
    echo ""
}

# -----------------------------------------------------------
# Точка входа
# -----------------------------------------------------------
case "${1:-help}" in
    start)        cmd_start "${2:-dev}" ;;
    stop)         cmd_stop ;;
    restart)      cmd_restart ;;
    deploy)       cmd_deploy "${@:2}" ;;
    update)       cmd_update ;;
    full-update)  cmd_full_update ;;
    backup)       cmd_backup ;;
    logs)         cmd_logs "${2:-50}" ;;
    status)       cmd_status ;;
    monitor)      cmd_monitor ;;
    check)        cmd_check ;;
    db-init)      cmd_db_init ;;
    install)      cmd_install ;;
    help|--help|-h) cmd_help ;;
    *)
        error "Неизвестная команда: $1"
        cmd_help
        exit 1
        ;;
esac
