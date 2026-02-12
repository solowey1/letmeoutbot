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
			MENU: 'admin_keys',
			PENDING: 'admin_keys_pending_menu',
		},
		PAYMENTS: {
			MENU: 'admin_payments',
		},
		STATS: {
			MENU: 'admin_stats_menu',
		},
		USERS: {
			MENU: 'admin_users_menu',
		},
		WITHDRAWALS: {
			PENDING: 'admin_withdrawals_pending',
		},
		BROADCAST: 'admin_broadcast',
		BROADCAST_AUDIENCE: {
			ALL: 'admin_broadcast_all',
			ACTIVE: 'admin_broadcast_active',
			BUYERS: 'admin_broadcast_buyers',
			NON_BUYERS: 'admin_broadcast_non_buyers',
		},
		SETTINGS: 'admin_settings',
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
	REFERRAL: {
		MENU: 'referral_menu',
		INVITE: 'referral_invite',
		GET_LINK: 'referral_get_link',
		WITHDRAW: 'referral_withdraw',
		CONFIRM_WITHDRAW: 'referral_confirm_withdraw',
		MY_REFERRALS: 'referral_my_referrals',
		HISTORY: 'referral_history',
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

const REFERRAL_CONFIG = {
	COMMISSION_RATE: 0.3, // 30% комиссия
	WITHDRAWAL_DELAY_DAYS: 14, // Период ожидания перед выводом (в днях)
	MIN_WITHDRAWAL_AMOUNT: 1, // Минимальная сумма для вывода (в звездах)
};

const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];

module.exports = {
	PLANS,
	KEY_STATUS,
	LANG,
	PAYMENT_STATUS,
	CALLBACK_ACTIONS,
	NOTIFICATION_TYPES,
	REFERRAL_CONFIG,
	ADMIN_IDS,
};