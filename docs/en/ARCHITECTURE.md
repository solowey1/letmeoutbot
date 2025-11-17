# VPN Telegram Bot Architecture

## Overview

VPN Telegram Bot is a modular application for automating VPN key sales through Telegram with Telegram Stars payment.

## Project Structure

```
vpnbot/
├── src/
│   ├── index.js                    # Entry point
│   ├── bot/
│   │   └── index.js                # Main bot class
│   ├── bot/handlers/
│   │   └── callbacks/              # Callback query handlers
│   │       ├── AdminCallbacks.js   # Admin functions
│   │       ├── KeysCallbacks.js    # Key management
│   │       ├── PlanCallbacks.js    # Plan selection
│   │       ├── MenuCallbacks.js    # Menu navigation
│   │       └── LanguageCallbacks.js # Language selection
│   ├── bot/listeners/
│   │   ├── CallbackHandler.js      # Callback router
│   │   ├── CommandHandlers.js      # Command handlers
│   │   ├── MessageHandlers.js      # Message handlers
│   │   └── PaymentHandlers.js      # Payment handlers
│   ├── services/
│   │   ├── PaymentService.js       # Payment service
│   │   ├── KeysService.js          # Key management
│   │   ├── OutlineService.js       # Outline VPN API
│   │   ├── PlanService.js          # Pricing plans
│   │   ├── NotificationService.js  # Notifications
│   │   └── I18nService.js          # Internationalization
│   ├── services/messages/          # Message templates
│   │   ├── AdminMessages.js
│   │   ├── KeysMessages.js
│   │   ├── PlanMessages.js
│   │   ├── MenuMessages.js
│   │   └── index.js
│   ├── models/
│   │   ├── Database.js             # SQLite model
│   │   ├── PostgresDatabase.js     # PostgreSQL model
│   │   └── SupabaseDatabase.js     # Supabase model
│   ├── middleware/
│   │   └── i18nMiddleware.js       # i18n middleware
│   ├── utils/
│   │   └── keyboards.js            # Keyboards
│   └── config/
│       ├── constants.js            # Constants
│       └── index.js                # Configuration
├── migrations/
│   └── init.sql                    # Database schema
├── locales/                        # Translations
│   ├── en.json
│   └── ru.json
├── install.sh                      # Installation script
├── quick-start.sh                  # Quick start for dev
├── init-database.sh                # Database initialization
├── check-setup.sh                  # Setup verification
└── docs/                           # Documentation
    ├── en/                         # English
    └── ru/                         # Russian
```

## Architectural Layers

### 1. Presentation Layer (Bot)
- **bot/index.js**: Main bot class, initialization
- **bot/listeners/**: Telegram event handlers
- **bot/handlers/callbacks/**: Specific button handlers

### 2. Service Layer (Business Logic)
- **PaymentService**: Invoice creation, payment processing
- **KeysService**: VPN key creation, monitoring, management
- **OutlineService**: Outline VPN API integration
- **PlanService**: Pricing plan management
- **NotificationService**: User notifications
- **I18nService**: Multi-language support

### 3. Data Layer (Data)
- **models/**: Abstraction over different databases
  - SQLite for development
  - PostgreSQL for medium projects
  - Supabase for production

### 4. Infrastructure
- **middleware/**: Middleware
- **utils/**: Helper functions
- **config/**: Application configuration

## Data Flow

### VPN Key Purchase

```
User clicks "Buy VPN"
  ↓
MenuCallbacks handles callback
  ↓
Shows plan list (PlanService)
  ↓
User selects plan
  ↓
PlanCallbacks creates invoice (PaymentService)
  ↓
Telegram shows payment form
  ↓
User pays
  ↓
PaymentHandlers processes successful payment
  ↓
KeysService creates VPN key (OutlineService)
  ↓
Key saved to database
  ↓
User receives access key
```

### Limits Monitoring

```
Cron task (every 30 min)
  ↓
KeysService.checkAllActiveKeys()
  ↓
For each active key:
  ↓
OutlineService gets traffic usage
  ↓
Compares with limits
  ↓
If approaching limit:
  ↓
NotificationService sends notification
  ↓
Saves to DB (to avoid duplicates)
  ↓
If limit exceeded:
  ↓
OutlineService deletes key
  ↓
Updates status in DB
```

## Data Models

### Users
```javascript
{
  id: Integer (PK),
  telegram_id: BigInt (Unique),
  username: String,
  first_name: String,
  last_name: String,
  language_code: String,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Keys (VPN Keys)
```javascript
{
  id: Integer (PK),
  user_id: Integer (FK → users),
  plan_id: String,
  outline_key_id: Integer,
  access_url: Text,
  data_limit: BigInt (bytes),
  data_used: BigInt (bytes),
  expires_at: Timestamp,
  status: String (pending/active/expired/suspended),
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Payments
```javascript
{
  id: Integer (PK),
  user_id: Integer (FK → users),
  plan_id: String,
  amount: Integer (Telegram Stars),
  currency: String ('XTR'),
  telegram_payment_charge_id: String (Unique),
  status: String (pending/completed/failed/refunded),
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Usage Logs
```javascript
{
  id: Integer (PK),
  key_id: Integer (FK → keys),
  data_used: BigInt (bytes),
  logged_at: Timestamp
}
```

### Notifications
```javascript
{
  id: Integer (PK),
  key_id: Integer (FK → keys),
  notification_type: String,
  threshold_value: Integer,
  sent_at: Timestamp
}
```

## Key Patterns

### 1. Service Pattern
All business logic is encapsulated in services:
- Easy to test
- Reusable logic
- Clear separation of concerns

### 2. Repository Pattern
Database models abstract data access:
- Easy to switch between databases
- Unified interface
- Independence from specific database

### 3. Middleware Pattern
Middleware for request processing:
- i18n for multi-language support
- Automatic user creation
- Logging

### 4. Factory Pattern
Dynamic database instance creation:
```javascript
if (DATABASE_TYPE === 'supabase') {
  db = new SupabaseDatabase(...)
} else if (DATABASE_TYPE === 'postgres') {
  db = new PostgresDatabase(...)
} else {
  db = new SQLiteDatabase(...)
}
```

## Implementation Features

### Error Handling
- Try-catch blocks in all critical places
- Retry mechanism for Outline API (3 attempts)
- Logging of all errors
- User notifications about problems

### Security
- Validation of all input data
- Access rights verification (ADMIN_IDS)
- Secure secret storage (.env)
- SQL injection protection (parameterized queries)

### Performance
- Indexes on frequently queried fields
- Plan caching
- Asynchronous processing
- Notification batching

### Scalability
- Stateless design (can run multiple instances)
- Cloud database support (Supabase)
- Horizontal scaling via load balancer
- Separate services (microservice architecture possible)

## Integrations

### Telegram Bot API
- Telegraf framework
- Inline keyboards
- Telegram Stars payments
- Webhook / Long polling

### Outline VPN API
- Access key creation
- Usage monitoring
- Limit management
- Key deletion

### Databases
- SQLite via sqlite3
- PostgreSQL via pg
- Supabase via @supabase/supabase-js

## Configuration

### Environment Variables
```env
# Telegram
TELEGRAM_BOT_TOKEN=xxx
ADMIN_IDS=123,456

# Outline
OUTLINE_API_URL=https://...

# Database
DATABASE_TYPE=supabase
SUPABASE_URL=https://...
SUPABASE_API_KEY=xxx

# App
NODE_ENV=production
LOG_LEVEL=info
```

### Constants
- Pricing plans
- Notification types
- Message texts
- Limits and thresholds

## Deployment

### Docker
- Multi-stage builds
- Health checks
- Volume mounts for persistence
- Network isolation

### Process Management
- PM2 for Node.js processes
- Systemd for Docker Compose
- Auto-restart on failure
- Log rotation

## Monitoring

### Logging
- Structured logs
- Different levels (debug, info, warn, error)
- Timestamp and context
- Rotation (10MB max, 3 files)

### Metrics
- User statistics
- Active keys
- Payments
- Revenue tracking

### Alerts
- Critical errors
- Outline API issues
- Limit exceeded
- Failed payments

## Development

### Environments
- **Development**: SQLite, hot reload, debug logs
- **Production**: Supabase/PostgreSQL, Docker, info logs

### Testing
- Unit tests for services
- Integration tests for API
- E2E tests for critical flows

### CI/CD
- Automatic testing
- Docker image build
- Server deployment
- Database migrations

## Future Improvements

### Planned
- [ ] Referral program
- [ ] Telegram Mini App for statistics
- [ ] Multiple Outline servers
- [ ] User behavior analytics
- [ ] A/B price testing
- [ ] Webhook instead of long polling
- [ ] Redis for caching
- [ ] GraphQL API
- [ ] Web admin panel

---

**Architecture Version**: 2.0
