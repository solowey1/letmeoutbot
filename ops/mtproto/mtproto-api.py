#!/usr/bin/env python3
"""
Прослойка управления секретами MTProto.

Даёт боту тот же способ работы, что и панель xray: HTTP-запрос с Bearer-токеном.
Без SSH из контейнера бота — ключ от ноды в скомпрометированном боте опаснее,
чем сам бот.

Только стандартная библиотека: на ноде не нужен ни pip, ни venv.

    POST   /users        {"email":"lmo_123_45"}  -> {"secret":..., "link":...}
    DELETE /users/{email}                        -> {"deleted":true}
    GET    /users                                -> {"users":[...]}
    GET    /health                               -> {"ok":true,"users":N}

Слушает 127.0.0.1: наружу выставляется через ufw только для IP панели,
либо вообще не выставляется, если бот ходит через SSH-туннель.
"""

import http.server, json, os, re, secrets, subprocess, sys, threading, urllib.parse

USERS_FILE = os.environ.get("USERS_FILE", "/srv/mtproto/data/users.json")
TOKEN      = os.environ.get("MTP_API_TOKEN", "")
HOST       = os.environ.get("MTP_HOST", "node1.let-me-out.com")
PORT_PROXY = os.environ.get("MTP_PORT", "8443")
TLS_DOMAIN = os.environ.get("TLS_DOMAIN", "www.cloudflare.com")
LISTEN     = os.environ.get("API_LISTEN", "127.0.0.1")
LISTEN_PORT= int(os.environ.get("API_PORT", "8081"))
COMPOSE_DIR= os.environ.get("COMPOSE_DIR", "/srv/mtproto")

if not TOKEN:
    sys.exit("MTP_API_TOKEN не задан — отказываюсь стартовать без авторизации")

# Имя пользователя идёт в конфиг и в имена метрик. Разрешаем только
# безопасный набор символов, чтобы исключить любые сюрпризы.
SAFE = re.compile(r"^[A-Za-z0-9_.@-]{1,64}$")
_lock = threading.Lock()


def load():
    try:
        with open(USERS_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save(users):
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    tmp = USERS_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(users, f, indent=2, sort_keys=True)
    os.replace(tmp, USERS_FILE)          # атомарно: прокси не увидит полуфайл


def reload_proxy():
    """Перечитать конфиг. SIGHUP, если поддерживается, иначе рестарт.

    Рестарт рвёт активные соединения на ~1 секунду, но Telegram переподключается
    сам и пользователь этого не замечает.
    """
    try:
        subprocess.run(["docker", "kill", "-s", "HUP", "mtprotoproxy"],
                       check=True, capture_output=True, timeout=10)
        return "sighup"
    except Exception:
        subprocess.run(["docker", "compose", "restart", "mtprotoproxy"],
                       cwd=COMPOSE_DIR, check=False, capture_output=True, timeout=60)
        return "restart"


def make_link(secret_hex):
    """Ссылка с секретом FakeTLS: ee + 32 hex + домен в hex."""
    ee = "ee" + secret_hex + TLS_DOMAIN.encode().hex()
    q = urllib.parse.urlencode({"server": HOST, "port": PORT_PROXY, "secret": ee})
    return f"https://t.me/proxy?{q}", f"tg://proxy?{q}"


class H(http.server.BaseHTTPRequestHandler):
    server_version = "mtp-api"

    def _auth(self):
        if self.headers.get("Authorization", "") != f"Bearer {TOKEN}":
            self._send(401, {"error": "unauthorized"})
            return False
        return True

    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *a):          # без логов с телом запроса
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % a))

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"ok": True, "users": len(load())})
        if not self._auth():
            return
        if self.path == "/users":
            return self._send(200, {"users": sorted(load().keys())})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if not self._auth():
            return
        if self.path != "/users":
            return self._send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._send(400, {"error": "bad json"})

        email = str(data.get("email", "")).strip()
        if not SAFE.match(email):
            return self._send(400, {"error": "email: разрешены A-Za-z0-9_.@- до 64 символов"})

        with _lock:
            users = load()
            if email in users:                       # идемпотентно
                sec = users[email]
            else:
                sec = secrets.token_hex(16)          # 16 байт, как требует протокол
                users[email] = sec
                save(users)
                how = reload_proxy()
        https, tg = make_link(sec)
        return self._send(200, {"email": email, "secret": sec,
                                "link": https, "tg_link": tg})

    def do_DELETE(self):
        if not self._auth():
            return
        m = re.fullmatch(r"/users/([^/]+)", self.path)
        if not m:
            return self._send(404, {"error": "not found"})
        email = urllib.parse.unquote(m.group(1))
        with _lock:
            users = load()
            if email not in users:
                return self._send(404, {"error": "no such user"})
            del users[email]
            save(users)
            reload_proxy()
        return self._send(200, {"deleted": True, "email": email})


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer((LISTEN, LISTEN_PORT), H)
    print(f"mtproto-api на {LISTEN}:{LISTEN_PORT}, пользователей: {len(load())}",
          flush=True)
    srv.serve_forever()
