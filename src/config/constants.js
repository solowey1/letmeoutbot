const PLANS = {
	TEST_100MB: {
		id: 'test_100mb',
		name: 'TEST',
		dataLimit: 100 * 1024 * 1024, // 100MB в байтах
		duration: 1, // дней
		price: 1, // звёзд
		emoji: '🐌',
	},
	BASIC_10GB: {
		id: 'basic_10gb',
		name: 'BASIC 10',
		dataLimit: 10 * 1024 * 1024 * 1024, // 10GB в байтах
		duration: 30, // дней
		price: 3, // звёзд ($1.5)
		emoji: '🐛',
	},
	BASIC_50GB: {
		id: 'basic_50gb',
		name: 'BASIC 50',
		dataLimit: 50 * 1024 * 1024 * 1024, // 50GB в байтах
		duration: 30, // дней
		price: 4, // звёзд ($2.2)
		emoji: '🦋',
	},
	STANDARD_100GB: {
		id: 'standard_100gb',
		name: 'STANDARD 100',
		dataLimit: 100 * 1024 * 1024 * 1024, // 100GB в байтах
		duration: 30, // дней
		price: 5, // звёзд ($2.8)
		emoji: '🐥',
	},
	STANDARD_300GB: {
		id: 'standard_300gb',
		name: 'STANDARD 300',
		dataLimit: 300 * 1024 * 1024 * 1024, // 300GB в байтах
		duration: 90, // дней
		price: 14, // звёзд ($7.8)
		emoji: '🦆',
	},
	PRO_600GB: {
		id: 'pro_600gb',
		name: 'PRO 600',
		dataLimit: 600 * 1024 * 1024 * 1024, // 600GB в байтах
		duration: 365, // дней
		price: 25, // звёзд ($14)
		emoji: '🦅',
	},
	PRO_1200GB: {
		id: 'pro_1200gb',
		name: 'PRO 1200',
		dataLimit: 1200 * 1024 * 1024 * 1024, // 1200GB в байтах
		duration: 365, // дней
		price: 48, // звёзд ($27)
		emoji: '🐲',
	},
};

const KEY_STATUS = {
	ACTIVE: 'active',
	EXPIRED: 'expired',
	SUSPENDED: 'suspended',
	PENDING: 'pending',
	REVOKED: 'revoked',
};

const LANG = {
	EN: 'en',
	RU: 'ru',
};

const PAYMENT_STATUS = {
	PENDING: 'pending',
	COMPLETED: 'completed',
	FAILED: 'failed',
	REFUNDED: 'refunded',
	PENDING_ACTIVATION: 'pending_activation', // Оплачено, но ключ не создан
};

const CALLBACK_ACTIONS = {
	ADMIN: {
		MENU: 'admin_menu',
		KEYS: {
			MENU: 'admin_keys_menu',
			PENDING: 'admin_keys_pending_menu',
		},
		STATS: {
			MENU: 'admin_stats_menu',
		},
		USERS: {
			MENU: 'admin_stats_menu',
		},
	},
	BASIC: {
		BACK_TO_MENU: 'back_menu',
	},
	KEYS: {
		MENU: 'keys_menu',
		BUY: 'keys_buy'
	},
	PAYMENT: {
		CONFIRM: 'payment_confirm',
	},
	SETTINGS: {
		MENU: 'settings_menu',
		LANGUAGE: {
			SET: 'lang_set',
		},
	},
};

const NOTIFICATION_TYPES = {
	TRAFFIC_WARNING_5: 'traffic_warning_5',
	TRAFFIC_WARNING_1: 'traffic_warning_1',
	TRAFFIC_EXHAUSTED: 'traffic_exhausted',
	TIME_WARNING_3: 'time_warning_3',
	TIME_WARNING_1: 'time_warning_1',
	TIME_EXPIRED: 'time_expired',
};

const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];

module.exports = {
	PLANS,
	KEY_STATUS,
	LANG,
	PAYMENT_STATUS,
	CALLBACK_ACTIONS,
	NOTIFICATION_TYPES,
	ADMIN_IDS,
};