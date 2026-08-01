# MTProto как продаваемый продукт

> Бот уже интегрирован с этим API: `src/services/MTProtoService.js`
> (`createUser`/`deleteUser`, тот же контракт, что описан ниже),
> подключается через `MTPROTO_API_URL`/`MTPROTO_API_TOKEN` в `.env` (см.
> `.env.example`). Разворачивать саму прослойку и `mtprotoproxy` на ноде —
> по инструкции ниже, вручную; бот сам ничего не разворачивает.

Ставится **на ноду** (83.217.222.151). Порт 8443 в ufw уже открыт.

Почему отдельный продукт, а не ещё один протокол в подписке: с 15 апреля 2026
российские маркетплейсы и банки блокируют пользователей VPN. Человеку, которому
нужен Telegram и при этом рабочий Ozon, полный VPN не подходит — весь трафик
заворачивать нельзя. MTProto решает ровно эту задачу и стоит дешевле.

## Почему не то, что уже стоит

`mtg`, который мы поставили ночью, держит **один секрет на инстанс** —
многопользовательский режим автор убрал во второй версии. Для продажи нужны
персональные секреты, иначе отзыв доступа одному ломает всем.

`alexbers/mtprotoproxy` многопользовательский из коробки и поддерживает FakeTLS.

## Развёртывание

```bash
ssh root@83.217.222.151

# 1. Освободить порт
systemctl disable --now mtg

# 2. Файлы
mkdir -p /srv/mtproto/data
# сюда: compose.yaml, config.py, mtproto-api.py, mtproto-api.service, api.env.example

cd /srv/mtproto
cp api.env.example api.env
sed -i "s|^MTP_API_TOKEN=.*|MTP_API_TOKEN=$(openssl rand -hex 32)|" api.env
chmod 600 api.env
grep MTP_API_TOKEN api.env          # записать в менеджер паролей

echo '{}' > data/users.json

# 3. Прокси
docker compose up -d
docker logs mtprotoproxy --tail 20
ss -tlnp | grep 8443                # должен быть python3 из контейнера

# 4. Прослойка
cp mtproto-api.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now mtproto-api
curl -s localhost:8081/health
```

## Как бот до неё дотягивается

API слушает `127.0.0.1` и наружу не выставляется. Два варианта связи с NL:

**Постоянный SSH-туннель** (рекомендую). На NL:

```bash
cat >/etc/systemd/system/mtproto-tunnel.service <<'EOF'
[Unit]
Description=SSH tunnel to node mtproto API
After=network-online.target

[Service]
ExecStart=/usr/bin/ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -i /root/.ssh/id_vpnnode -L 0.0.0.0:8081:127.0.0.1:8081 root@83.217.222.151
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now mtproto-tunnel
curl -s localhost:8081/health

# Докер-сетям — доступ к туннелю; снаружи 8081 остаётся под default deny
ufw allow from 172.16.0.0/12 to any port 8081 proto tcp comment 'bot -> mtproto tunnel'
```

Тогда для бота адрес — `http://host.docker.internal:8081`, ключ от ноды
остаётся на хосте и в контейнер бота не попадает.

Бинд именно `0.0.0.0`, не `127.0.0.1`: из контейнера `host.docker.internal`
резолвится в IP docker-шлюза (host-gateway, обычно `172.17.0.1`), а не в
loopback хоста. Туннель на `127.0.0.1` из контейнера недостижим — ufw молча
дропает пакеты, и бот получает timeout.

Проверять доступность нужно изнутри контейнера (curl с хоста недостаточно):

```bash
docker exec letmeoutbot node -e \
  "fetch('http://host.docker.internal:8081/health').then(r=>r.text()).then(console.log)"
```

**Или открыть порт для IP панели.** Проще, но API оказывается в интернете:

```bash
# на ноде
sed -i 's/^API_LISTEN=.*/API_LISTEN=0.0.0.0/' /srv/mtproto/api.env
systemctl restart mtproto-api
ufw allow from 194.32.98.93 to any port 8081 proto tcp comment 'mtproto api'
```

## Контракт для бота

```
POST   /users        {"email": "lmo_<tgid>_<planid>"}
       -> {"email":..., "secret":"32 hex", "link":"https://t.me/proxy?...",
           "tg_link":"tg://proxy?..."}
       идемпотентно: повторный вызов вернёт тот же секрет

DELETE /users/{email}   -> {"deleted": true}
GET    /users           -> {"users": [...]}
GET    /health          -> {"ok": true, "users": N}   без авторизации

Authorization: Bearer <MTP_API_TOKEN>
```

Клиенту отдавать **`link`** — она кликабельна в чате и открывается в Telegram
одним нажатием. `tg_link` для кнопок в интерфейсе.

Тарифы: только срок, без объёма. Считать трафик Telegram смысла нет — он
на порядок меньше видео, а лимит только добавит поводов для обращений
в поддержку.

## Что заложено намеренно

**Конфиг не шаблонизируется.** У `mtprotoproxy` `config.py` — исполняемый
Python, и подставлять туда данные от бота значит открыть инъекцию кода.
Поэтому пользователи в отдельном `users.json`, а конфиг его только читает.
Прослойка пишет исключительно JSON и валидирует имя по `[A-Za-z0-9_.@-]{1,64}`.

**Запись атомарная** — через временный файл и `os.replace`, чтобы прокси при
перечитывании не поймал полуфайл.

**Только FakeTLS.** Классический и secure режимы выключены: они опознаются DPI
и в РФ живут часами. Признак FakeTLS — секрет начинается с `ee`.

**Перезагрузка через SIGHUP**, с откатом на рестарт контейнера. Рестарт рвёт
соединения на секунду, Telegram переподключается сам.

## Что проверить после запуска

1. `curl -s localhost:8081/health` -> `{"ok":true,"users":0}`
2. Создать тестового: `curl -sX POST localhost:8081/users -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"email":"test1"}'`
3. Открыть полученную `link` на телефоне — в Telegram появится значок щита
4. Удалить: `curl -sX DELETE localhost:8081/users/test1 -H "Authorization: Bearer $T"`
5. Убедиться, что подключение отвалилось

## Открытые вопросы

**Ротация секретов.** Свежие обзоры отмечают, что ежесуточная смена заметно
продлевает жизнь прокси. Реализуемо: `PUT /users/{email}/rotate` плюс рассылка
новой ссылки ботом. Но это ломает «поставил и забыл» у пользователя — сначала
посмотри, как долго живёт статический секрет.

**Живучесть.** MTProto не неуязвим: в Петербурге вводили белые списки и
вскрывали такие прокси. Держи это в описании тарифа честно, иначе поддержка
получит поток обращений при первой же волне блокировок.
