# Quick Start Guide

## For Production (One Command)

```bash
sudo bash install.sh
```

Answer questions → Done! ☕

---

## For Development

```bash
./quick-start.sh
```

Interactive setup → Starts in dev mode

---

## What You'll Need

### 1. Telegram Bot Token
- Open [@BotFather](https://t.me/botfather)
- Send `/newbot`
- Enable payments: `/mybots` → Select bot → Payments
- Copy token

### 2. Your Telegram ID
- Send `/start` to [@userinfobot](https://t.me/userinfobot)
- Copy your ID

### 3. Outline VPN API URL
- Install [Outline Manager](https://getoutline.org/get-started/)
- Create server
- Copy "Management API URL" from settings

### 4. Database (Choose One)

**Option 1: Supabase** (Recommended)
- Go to [Supabase](https://app.supabase.com)
- Create project
- Get URL and API key from Settings → API

**Option 2: PostgreSQL**
- Use existing PostgreSQL server
- OR let install.sh set up local PostgreSQL in Docker

**Option 3: SQLite**
- No setup needed
- Good for testing only

---

## Installation Flow

```
Run install.sh
  ↓
Choose database (1-3)
  ↓
Enter database credentials
  ↓
Enter bot configuration
  ↓
Wait for automatic setup
  ↓
Done! ✅
```

---

## Verify Installation

```bash
./check-setup.sh
```

---

## Start Using

1. Send `/start` to your bot in Telegram
2. Try buying a VPN plan
3. Access admin panel with `/admin`

---

## Need Help?

- Full guide: [INSTALLATION.md](INSTALLATION.md)
- Check logs: `docker-compose logs -f`
- Verify setup: `./check-setup.sh`
