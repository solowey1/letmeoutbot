# Конфиг alexbers/mtprotoproxy.
#
# ВАЖНО: этот файл — исполняемый Python. Подставлять в него данные, пришедшие
# от бота, нельзя: это прямая инъекция кода. Поэтому список пользователей
# лежит отдельно в users.json, а сюда только читается.
# Прослойка mtproto-api пишет исключительно JSON.

import json
import os

_USERS_FILE = os.environ.get("USERS_FILE", "/data/users.json")

try:
    with open(_USERS_FILE) as _f:
        USERS = json.load(_f)
except (FileNotFoundError, json.JSONDecodeError):
    USERS = {}

# Порт. 8443 уже открыт в ufw на ноде.
PORT = int(os.environ.get("MTP_PORT", "8443"))

# ── Режимы маскировки ────────────────────────────────────────────────────
# Только FakeTLS: секрет клиента начинается с "ee", трафик выглядит как
# обычный HTTPS. Классический и secure режимы опознаются DPI и в РФ живут
# часами, поэтому выключены.
MODES = {
    "classic": False,
    "secure": False,
    "tls": True,
}

# Домен, под который маскируемся. Должен реально существовать и отвечать
# по TLS 1.3 — прокси при неверном секрете проксирует туда же.
TLS_DOMAIN = os.environ.get("TLS_DOMAIN", "www.cloudflare.com")

# ── Прочее ───────────────────────────────────────────────────────────────
# Рекламный тег канала. Пусто = без рекламы.
AD_TAG = os.environ.get("AD_TAG", "")

# Ограничение на число подключений с одного секрета: защита от того,
# что купленный доступ раздадут по чату.
MAX_CONNS_PER_USER = int(os.environ.get("MAX_CONNS_PER_USER", "0")) or None

# Прокси только для Telegram — резолвим их адреса напрямую, не через DNS
# пользователя.
PREFER_IPV6 = os.environ.get("PREFER_IPV6", "0") == "1"

# Статистика в лог раз в минуту — по ней видно живых пользователей.
STATS_PRINT_PERIOD = 600
