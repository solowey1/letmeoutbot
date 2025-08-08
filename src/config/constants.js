const PLANS = {
  BASIC_10GB: {
    id: 'basic_10gb',
    name: '10 ГБ на месяц',
    dataLimit: 10 * 1024 * 1024 * 1024, // 10GB в байтах
    duration: 30, // дней
    price: 129, // звёзд
    description: 'Идеально для базового использования',
    emoji: '🥉'
  },
  BASIC_30GB: {
    id: 'basic_30gb',
    name: '30 ГБ на месяц', 
    dataLimit: 30 * 1024 * 1024 * 1024, // 30GB в байтах
    duration: 30, // дней
    price: 279, // звёзд
    description: 'Отлично для повседневного использования',
    emoji: '🥈'
  },
  STANDARD_100GB: {
    id: 'standard_100gb',
    name: '100 ГБ на месяц',
    dataLimit: 100 * 1024 * 1024 * 1024, // 100GB в байтах
    duration: 30, // дней
    price: 749, // звёзд
    description: 'Для активного использования',
    emoji: '🥇'
  },
  PREMIUM_250GB: {
    id: 'premium_250gb',
    name: '250 ГБ на полгода',
    dataLimit: 250 * 1024 * 1024 * 1024, // 250GB в байтах
    duration: 180, // дней
    price: 2190, // звёзд
    description: 'Максимальный объем на полгода',
    emoji: '💎'
  },
  PREMIUM_500GB: {
    id: 'premium_500gb',
    name: '500 ГБ на полгода',
    dataLimit: 500 * 1024 * 1024 * 1024, // 500GB в байтах
    duration: 180, // дней
    price: 3990, // звёзд
    description: 'Для бизнеса и команд',
    emoji: '🚀'
  },
  PRO_1TB: {
    id: 'pro_1tb',
    name: '1 ТБ на год',
    dataLimit: 1024 * 1024 * 1024 * 1024, // 1TB в байтах
    duration: 365, // дней
    price: 7890, // звёзд
    description: 'Максимальный план на год',
    emoji: '👑'
  }
};

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

const BOT_COMMANDS = {
  START: 'start',
  HELP: 'help',
  ADMIN: 'admin'
};

const CALLBACK_ACTIONS = {
  BUY_PLAN: 'buy_plan',
  CONFIRM_PURCHASE: 'confirm_purchase',
  MY_SUBSCRIPTIONS: 'my_subs',
  EXTEND_SUBSCRIPTION: 'extend_sub',
  BACK_TO_MENU: 'back_menu',
  ADMIN_PANEL: 'admin_panel',
  ADMIN_USERS: 'admin_users',
  ADMIN_STATS: 'admin_stats'
};

const MESSAGES = {
  WELCOME: `🔐 <b>Добро пожаловать в VPN Premium Bot!</b>

Здесь вы можете приобрести доступ к безопасному и быстрому VPN через Outline.

💰 Оплата происходит через Telegram Stars
🚀 Мгновенная активация после покупки
🔒 Полная анонимность и безопасность

Выберите подходящий тарифный план:`,

  HELP: `ℹ️ <b>Справка по боту</b>

🔹 Выберите тарифный план
🔹 Оплатите через Telegram Stars  
🔹 Получите мгновенный доступ к VPN
🔹 Используйте ключ в приложении Outline

📱 <b>Приложения Outline:</b>
• <a href="https://play.google.com/store/apps/details?id=org.outline.android.client">Android</a>
• <a href="https://apps.apple.com/app/outline-app/id1356177741">iOS</a>
• <a href="https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe">Windows</a>
• <a href="https://s3.amazonaws.com/outline-releases/client/macos/stable/Outline-Client.dmg">macOS</a>`,

  NO_ACTIVE_SUBS: `📭 У вас пока нет активных подписок.

Выберите тарифный план для покупки доступа к VPN.`,

  PAYMENT_SUCCESS: `✅ <b>Платёж успешно обработан!</b>

Ваш VPN ключ создан и готов к использованию.`,

  PAYMENT_FAILED: `❌ <b>Ошибка оплаты</b>

Попробуйте еще раз или обратитесь в поддержку.`
};

const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];

module.exports = {
  PLANS,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  USER_ROLES,
  BOT_COMMANDS,
  CALLBACK_ACTIONS,
  MESSAGES,
  ADMIN_IDS
};