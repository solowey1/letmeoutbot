# Installation Guide

## Quick Start (Recommended)

### Automatic Installation

Run the interactive installation script:

```bash
sudo bash install.sh
```

The script will guide you through:
1. **Database selection** (SQLite, PostgreSQL, or Supabase)
2. **Database configuration** (credentials based on your choice)
3. **Bot configuration** (Telegram token, admin ID, 3x-ui panel credentials)
4. **Automatic setup** (Docker, services, firewall)

### Database Options

#### 1. SQLite
- **Best for**: Testing, small deployments
- **Pros**: Zero configuration, simple
- **Cons**: Not scalable, file-based
- **Setup**: Just specify file path

#### 2. PostgreSQL
- **Best for**: Medium projects
- **Pros**: Reliable, performant, full SQL
- **Cons**: Requires database server
- **Options**:
  - **Local**: Runs in Docker (automatic setup)
  - **Remote**: Connect to existing server

#### 3. Supabase (Recommended)
- **Best for**: Production, cloud
- **Pros**: Managed, automatic backups, scalable
- **Cons**: Requires internet
- **Get credentials**: [Supabase Dashboard](https://app.supabase.com) → Settings → API

---

## Manual Installation

### Prerequisites

- Node.js 18+
- npm
- Docker & Docker Compose (for production)
- PostgreSQL client (for PostgreSQL/Supabase)

### Steps

#### 1. Clone and Install

```bash
git clone <your-repo-url>
cd vpnbot
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

Required variables:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_IDS=your_telegram_id
XRAY_PANEL_URL=https://your-server:port/base-path
XRAY_API_TOKEN=your-api-token
XRAY_INBOUNDS=1,2
XRAY_SUB_BASE_URL=https://sub.your-domain/vpn
DATABASE_TYPE=supabase  # or sqlite, postgres
```

#### 3. Database Setup

**For SQLite:**
```env
DATABASE_TYPE=sqlite
DATABASE_PATH=./database.db
```
No additional setup needed!

**For PostgreSQL/Supabase:**
```bash
# Set DATABASE_URL in .env
./init-database.sh
```

#### 4. Start the Bot

**Development:**
```bash
npm run dev
```

**Production (Docker):**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Getting Credentials

### Telegram Bot Token

1. Open [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Follow instructions
4. **Important**: Enable payments (`/mybots` → Select bot → Payments)
5. Copy token

### Telegram Admin ID

Send `/start` to [@userinfobot](https://t.me/userinfobot)

### 3x-ui panel (VLESS + Hysteria2)

1. Deploy a [3x-ui](https://github.com/MHSanaei/3x-ui) panel
2. Create VLESS (Reality/XHTTP) and Hysteria2 inbounds
3. In the panel settings → "Account" copy the API token
4. Copy the relevant inbound IDs and set up a domain for the subscription (`XRAY_SUB_BASE_URL`)

### Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create/select project
3. Go to Settings → API
4. Copy:
   - **URL** (Project URL)
   - **API Key** (anon/public key)

---

## Verification

Check your setup:

```bash
./check-setup.sh
```

This verifies:
- Dependencies installed
- Configuration complete
- Database accessible
- Bot ready to run

---

## Troubleshooting

### Bot Not Responding

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart
docker-compose -f docker-compose.prod.yml restart
```

### Database Connection Issues

**PostgreSQL/Supabase:**
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1"
```

**SQLite:**
```bash
# Check file permissions
ls -la database.db
```

### Payment Issues

- Enable payments in [@BotFather](https://t.me/botfather)
- Telegram Stars must be available in your region

---

## Next Steps

1. Test bot: Send `/start` in Telegram
2. Try payment flow
3. Access admin panel: `/admin`
4. Review logs
5. Set up monitoring

---

For more details, see [Quick Start Guide](QUICK_START.md) or [Architecture](ARCHITECTURE.md).
