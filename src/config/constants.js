const PLANS = {
  TEST_100MB: {
    id: 'test_100mb',
    name: 'TEST',
    dataLimit: 100 * 1024 * 1024, // 100MB в байтах
    duration: 1, // дней
    price: 1, // звёзд
    description: 'Если хочется проверить работоспособность',
    invoice: 'Ключ Outline VPN с лимитом в 100Мб на 1 день',
    emoji: '🐌'
  },
  BASIC_10GB: {
    id: 'basic_10gb',
    name: 'BASIC 10',
    dataLimit: 10 * 1024 * 1024 * 1024, // 10GB в байтах
    duration: 30, // дней
    price: 3, // звёзд ($1.5)
    description: 'Идеально для базового использования',
    invoice: 'Ключ Outline VPN с лимитом в 10Гб на 1 месяц',
    emoji: '🐛'
  },
  BASIC_50GB: {
    id: 'basic_50gb',
    name: 'BASIC 50', 
    dataLimit: 50 * 1024 * 1024 * 1024, // 50GB в байтах
    duration: 30, // дней
    price: 4, // звёзд ($2.2)
    description: 'Популярный выбор для ежедневного использования',
    invoice: 'Ключ Outline VPN с лимитом в 50Гб на 1 месяц',
    emoji: '🦋'
  },
  STANDARD_100GB: {
    id: 'standard_100gb',
    name: 'STANDARD 100',
    dataLimit: 100 * 1024 * 1024 * 1024, // 100GB в байтах
    duration: 30, // дней
    price: 5, // звёзд ($2.8)
    description: 'Для активного использования',
    invoice: 'Ключ Outline VPN с лимитом в 100Гб на 1 месяц',
    emoji: '🐥'
  },
  STANDARD_300GB: {
    id: 'standard_300gb',
    name: 'STANDARD 300',
    dataLimit: 300 * 1024 * 1024 * 1024, // 300GB в байтах
    duration: 90, // дней
    price: 14, // звёзд ($7.8)
    description: 'Выгодный план на 3 месяца',
    invoice: 'Ключ Outline VPN с лимитом в 300Гб на 3 месяца',
    emoji: '🦆'
  },
  PRO_600GB: {
    id: 'pro_600gb',
    name: 'PRO 600',
    dataLimit: 600 * 1024 * 1024 * 1024, // 600GB в байтах
    duration: 365, // дней
    price: 25, // звёзд ($14)
    description: 'Годовой план с максимальной выгодой',
    invoice: 'Ключ Outline VPN с лимитом в 600Гб на 1 год',
    emoji: '🦅'
  },
  PRO_1200GB: {
    id: 'pro_1200gb',
    name: 'PRO 1200',
    dataLimit: 1200 * 1024 * 1024 * 1024, // 1200GB в байтах
    duration: 365, // дней
    price: 48, // звёзд ($27)
    description: 'Максимальный план для тяжелого использования',
    invoice: 'Ключ Outline VPN с лимитом в 1200Гб на 1 год',
    emoji: '🐲'
  },
};

const KEY_STATUS = {
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
  CHECKOUT: 'checkout',
  MY_KEYS: 'my_keys',
  EXTEND_KEY: 'extend_key',
  BACK_TO_MENU: 'back_menu',
  ADMIN_PANEL: 'admin_panel',
  ADMIN_USERS: 'admin_users',
  ADMIN_STATS: 'admin_stats'
};

const MESSAGES = {
  WELCOME: `🔐 <b>Let me Out VPN приветствует вас!</b>

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
• <a href="https://getoutline.org/ru/get-started/#step-3">Официальный сайт</a>
• <a href="https://play.google.com/store/apps/details?id=org.outline.android.client">Android</a>
• <a href="https://apps.apple.com/app/outline-app/id1356177741">iOS</a>
• <a href="https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe">Windows</a>
• <a href="https://s3.amazonaws.com/outline-releases/client/macos/stable/Outline-Client.dmg">macOS</a>`,

  NO_ACTIVE_SUBS: `📭 У вас пока нет активных ключей.

Выберите тарифный план для покупки доступа к VPN.`,

  PAYMENT_SUCCESS: `✅ <b>Платёж успешно обработан!</b>

Ваш VPN ключ создан и готов к использованию.`,

  PAYMENT_FAILED: `❌ <b>Ошибка оплаты</b>

Попробуйте еще раз или обратитесь в поддержку.`
};

const NOTIFICATION_TYPES = {
  TRAFFIC_WARNING_5: 'traffic_warning_5',
  TRAFFIC_WARNING_1: 'traffic_warning_1',
  TRAFFIC_EXHAUSTED: 'traffic_exhausted',
  TIME_WARNING_3: 'time_warning_3',
  TIME_WARNING_1: 'time_warning_1',
  TIME_EXPIRED: 'time_expired'
};

const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];

module.exports = {
  PLANS,
  KEY_STATUS,
  SUBSCRIPTION_STATUS: KEY_STATUS, // Backward compatibility
  PAYMENT_STATUS,
  USER_ROLES,
  BOT_COMMANDS,
  CALLBACK_ACTIONS,
  MESSAGES,
  NOTIFICATION_TYPES,
  ADMIN_IDS
};