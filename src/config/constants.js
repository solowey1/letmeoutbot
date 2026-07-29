// ============================================================
// ПЛАНЫ ТАРИФИКАЦИИ
// Единая сетка: объём + срок. Технически ключ выдаётся через VLESS
// (+ Hysteria2 в той же подписке), протокол пользователю не показывается.
//
// Рыночные цены (Telegram Stars, 1 Star ≈ $0.013):
//   Конкуренты: ~$2–4/мес за 10–30 GB, ~$5–8/мес за 100 GB
// ============================================================

const PLANS = {
	// ─────────────────────────────────────────
	// ТЕСТОВЫЙ (только для разработки/отладки)
	// ─────────────────────────────────────────
	TEST_VLESS: {
		id: 'vless_test',
		name: 'TEST VLESS',
		type: 'vless',
		dataLimitGB: 1,
		dataLimit: 100 * 1024 * 1024,
		duration: 1,
		price: 1,
		emoji: '🐌',
		hidden: true
	},

	// ─────────────────────────────────────────
	// ПОДАРОЧНЫЕ (бесплатно, 48ч, 500 МБ)
	// ─────────────────────────────────────────
	GIFT_VLESS_10GB: {
		id: 'gift_vless_10gb',
		name: 'VLESS 10 GB (Gift)',
		type: 'vless',
		dataLimitGB: 10,
		dataLimit: 10 * 1024 * 1024 * 1024,
		duration: 7,
		price: 0,
		emoji: '🎁',
		hidden: true
	},
	GIFT_VLESS_500MB: {
		id: 'gift_vless_500mb',
		name: '500 MB (Gift)',
		type: 'vless',
		dataLimitGB: 0,
		dataLimit: 500 * 1024 * 1024,
		duration: 2,
		price: 0,
		emoji: '🎁',
		hidden: true
	},

	// ─────────────────────────────────────────
	// ОСНОВНАЯ ТАРИФНАЯ СЕТКА
	// ─────────────────────────────────────────
	VLESS_2GB: {
		id: 'vless_2gb',
		name: '2 GB',
		type: 'vless',
		dataLimitGB: 2,
		dataLimit: 2 * 1024 * 1024 * 1024,
		duration: 30,
		price: 20,                 // ~$0.26/мес
		emoji: '🌱'
	},
	VLESS_10GB: {
		id: 'vless_10gb',
		name: '10 GB',
		type: 'vless',
		dataLimitGB: 10,
		dataLimit: 10 * 1024 * 1024 * 1024,
		duration: 30,
		price: 100,                // ~$1.3/мес
		emoji: '⚡'
	},
	VLESS_50GB: {
		id: 'vless_50gb',
		name: '50 GB',
		type: 'vless',
		dataLimitGB: 50,
		dataLimit: 50 * 1024 * 1024 * 1024,
		duration: 30,
		price: 250,                // ~$3.3/мес
		emoji: '🚀'
	},
	VLESS_100GB: {
		id: 'vless_100gb',
		name: '100 GB',
		type: 'vless',
		dataLimitGB: 100,
		dataLimit: 100 * 1024 * 1024 * 1024,
		duration: 30,
		price: 400,                // ~$5.2/мес
		emoji: '🛸'
	},
	VLESS_UNLIM: {
		id: 'vless_unlim',
		name: 'Unlimited',
		type: 'vless',
		dataLimitGB: 0,
		dataLimit: 0,
		duration: 30,
		price: 600,                // ~$7.8/мес
		emoji: '🌌'
	}
};

const KEY_STATUS = {
	ACTIVE: 'active',
	EXPIRED: 'expired',
	SUSPENDED: 'suspended',
	PENDING: 'pending'
};

const KEY_TYPE = {
	VLESS: 'vless'
};

const LANG = {
	EN: 'en',
	RU: 'ru'
};

const PAYMENT_STATUS = {
	PENDING: 'pending',
	COMPLETED: 'completed',
	FAILED: 'failed',
	REFUNDED: 'refunded',
	PENDING_ACTIVATION: 'pending_activation'
};

const CALLBACK_ACTIONS = {
	ADMIN: {
		MENU: 'admin_menu',
		KEYS: {
			MENU: 'admin_keys',
			PENDING: 'admin_keys_pending',
			RETRY_ACTIVATE: 'admin_key_retry'
		},
		PAYMENTS: { MENU: 'admin_payments' },
		STATS: { MENU: 'admin_stats_menu' },
		USERS: { MENU: 'admin_users_menu' },
		WITHDRAWALS: {
			PENDING: 'admin_withdrawals_pending',
			VIEW: 'admin_withdrawal_view',
			APPROVE: 'withdrawal_approve',
			REJECT: 'withdrawal_reject',
			MANUAL_PAID: 'withdrawal_manual_paid',
			MANUAL_UNPAID: 'withdrawal_manual_unpaid',
		},
		BROADCAST: 'admin_broadcast',
		BROADCAST_AUDIENCE: {
			ALL: 'admin_broadcast_all',
			ACTIVE: 'admin_broadcast_active',
			BUYERS: 'admin_broadcast_buyers',
			NON_BUYERS: 'admin_broadcast_non_buyers'
		},
		SETTINGS: 'admin_settings'
	},
	BASIC: {
		HOME: 'home',
		HELP: 'help',
		VPN_APPS: 'vpn_apps',
		VLESS_APPS_LINUX: 'vless_apps_linux',
		VLESS_APPS_WINDOWS: 'vless_apps_windows',
		VLESS_APPS_MACOS: 'vless_apps_macos',
		VLESS_APPS_IOS: 'vless_apps_ios',
		VLESS_APPS_ANDROID: 'vless_apps_android',
		HOW_TO_ADD_KEY: 'how_to_add_key',
		HOWTO_APPS: 'howto_apps',
		HOWTO_VLESS_APPS_LINUX: 'howto_vless_apps_linux',
		HOWTO_VLESS_APPS_WINDOWS: 'howto_vless_apps_windows',
		HOWTO_VLESS_APPS_MACOS: 'howto_vless_apps_macos',
		HOWTO_VLESS_APPS_IOS: 'howto_vless_apps_ios',
		HOWTO_VLESS_APPS_ANDROID: 'howto_vless_apps_android',
		SUPPORT: 'support',
		RETRY: 'retry'
	},
	KEYS: {
		MENU: 'keys_menu',
		BUY: 'keys_buy',
		DETAILS: 'key_details',
		STATS: 'key_stats',
		CHECKOUT: 'checkout',
		RAW_VLESS: 'key_raw_vless'
	},
	PAYMENT: {
		CONFIRM: 'payment_confirm',
		CREATE_INVOICE: 'confirm_payment'
	},
	SETTINGS: {
		MENU: 'settings_menu',
		LANGUAGE: {
			SET: 'lang_set',
			RU: 'set_lang_ru',
			EN: 'set_lang_en'
		},
		TON_WALLET: 'settings_ton_wallet',
		TON_WALLET_INPUT: 'settings_ton_wallet_input',
	},
	REFERRAL: {
		MENU: 'referral_menu',
		GET_LINK: 'referral_get_link',
		INVITE: 'referral_invite',
		WITHDRAW: 'referral_withdraw',
		CONFIRM_WITHDRAW: 'referral_confirm_withdraw',
		MY_REFERRALS: 'referral_my_referrals',
		HISTORY: 'referral_history',
		SET_WALLET: 'referral_set_wallet',
	},
	GIFT: {
		INFO: 'gift_info',
		CLAIM: 'gift_claim'
	}
};

const NOTIFICATION_TYPES = {
	TRAFFIC_WARNING_5: 'traffic_warning_5',
	TRAFFIC_WARNING_1: 'traffic_warning_1',
	TRAFFIC_EXHAUSTED: 'traffic_exhausted',
	TIME_WARNING_3: 'time_warning_3',
	TIME_WARNING_1: 'time_warning_1',
	TIME_EXPIRED: 'time_expired'
};

const OS_VARIANTS = {
	WEBSITE: 'website',
	ANDROID: 'android',
	IOS: 'ios',
	WINDOWS: 'windows',
	MACOS: 'macos',
	LINUX: 'linux',
};

const REFERRAL_CONFIG = {
	COMMISSION_RATE: 0.3,
	WITHDRAWAL_DELAY_DAYS: 14,
	MIN_WITHDRAWAL_AMOUNT: 1
};

const ADMIN_IDS = process.env.ADMIN_IDS
	? process.env.ADMIN_IDS.split(',').map(id => parseInt(id))
	: [];

module.exports = {
	PLANS,
	KEY_STATUS,
	KEY_TYPE,
	LANG,
	PAYMENT_STATUS,
	CALLBACK_ACTIONS,
	NOTIFICATION_TYPES,
	OS_VARIANTS,
	REFERRAL_CONFIG,
	ADMIN_IDS
};
