// ============================================================
// ПЛАНЫ ТАРИФИКАЦИИ
// Каждый план существует в трёх вариантах:
//   outline  — только Outline VPN (Shadowsocks)
//   vless    — только VLESS (WS + Reality)
//   both     — оба протокола со скидкой ~20%
//
// Рыночные цены (Telegram Stars, 1 Star ≈ $0.013):
//   Конкуренты: ~$2–4/мес за 10–30 GB, ~$5–8/мес за 100 GB
// ============================================================

const PLANS = {
	// ─────────────────────────────────────────
	// ТЕСТОВЫЙ (только для разработки/отладки)
	// ─────────────────────────────────────────
	TEST: {
		id: 'test',
		name: 'TEST',
		type: 'outline',
		dataLimitGB: 0.1,          // 100 MB
		dataLimit: 100 * 1024 * 1024,
		duration: 1,
		price: 1,
		emoji: '🐌',
		hidden: true               // не показывать обычным пользователям
	},

	// ─────────────────────────────────────────
	// OUTLINE — только Outline VPN
	// ─────────────────────────────────────────
	OUTLINE_10GB: {
		id: 'outline_10gb',
		name: 'Outline 10 GB',
		type: 'outline',
		dataLimitGB: 10,
		dataLimit: 10 * 1024 * 1024 * 1024,
		duration: 30,
		price: 175,                // ~$2.3/мес
		emoji: '🌿'
	},
	OUTLINE_50GB: {
		id: 'outline_50gb',
		name: 'Outline 50 GB',
		type: 'outline',
		dataLimitGB: 50,
		dataLimit: 50 * 1024 * 1024 * 1024,
		duration: 30,
		price: 300,                // ~$3.9/мес
		emoji: '🌲'
	},
	OUTLINE_100GB: {
		id: 'outline_100gb',
		name: 'Outline 100 GB',
		type: 'outline',
		dataLimitGB: 100,
		dataLimit: 100 * 1024 * 1024 * 1024,
		duration: 30,
		price: 450,                // ~$5.9/мес
		emoji: '🌳'
	},
	OUTLINE_UNLIM: {
		id: 'outline_unlim',
		name: 'Outline Безлимит',
		type: 'outline',
		dataLimitGB: 0,            // 0 = безлимит
		dataLimit: 0,
		duration: 30,
		price: 650,                // ~$8.5/мес
		emoji: '🌏'
	},

	// ─────────────────────────────────────────
	// VLESS — только VLESS (WS + Reality)
	// ─────────────────────────────────────────
	VLESS_10GB: {
		id: 'vless_10gb',
		name: 'VLESS 10 GB',
		type: 'vless',
		dataLimitGB: 10,
		dataLimit: 10 * 1024 * 1024 * 1024,
		duration: 30,
		price: 225,                // ~$2.9/мес (дороже Outline)
		emoji: '⚡'
	},
	VLESS_50GB: {
		id: 'vless_50gb',
		name: 'VLESS 50 GB',
		type: 'vless',
		dataLimitGB: 50,
		dataLimit: 50 * 1024 * 1024 * 1024,
		duration: 30,
		price: 375,                // ~$4.9/мес
		emoji: '🚀'
	},
	VLESS_100GB: {
		id: 'vless_100gb',
		name: 'VLESS 100 GB',
		type: 'vless',
		dataLimitGB: 100,
		dataLimit: 100 * 1024 * 1024 * 1024,
		duration: 30,
		price: 550,                // ~$7.2/мес
		emoji: '🛸'
	},
	VLESS_UNLIM: {
		id: 'vless_unlim',
		name: 'VLESS Безлимит',
		type: 'vless',
		dataLimitGB: 0,
		dataLimit: 0,
		duration: 30,
		price: 800,                // ~$10.4/мес
		emoji: '🌌'
	},

	// ─────────────────────────────────────────
	// BOTH — Outline + VLESS со скидкой ~20%
	// ─────────────────────────────────────────
	BOTH_10GB: {
		id: 'both_10gb',
		name: 'Outline + VLESS 10 GB',
		type: 'both',
		dataLimitGB: 10,
		dataLimit: 10 * 1024 * 1024 * 1024,
		duration: 30,
		price: 320,                // vs 175+225=400, скидка 20%
		emoji: '💎'
	},
	BOTH_50GB: {
		id: 'both_50gb',
		name: 'Outline + VLESS 50 GB',
		type: 'both',
		dataLimitGB: 50,
		dataLimit: 50 * 1024 * 1024 * 1024,
		duration: 30,
		price: 540,                // vs 300+375=675, скидка 20%
		emoji: '💠'
	},
	BOTH_100GB: {
		id: 'both_100gb',
		name: 'Outline + VLESS 100 GB',
		type: 'both',
		dataLimitGB: 100,
		dataLimit: 100 * 1024 * 1024 * 1024,
		duration: 30,
		price: 800,                // vs 450+550=1000, скидка 20%
		emoji: '👑'
	},
	BOTH_UNLIM: {
		id: 'both_unlim',
		name: 'Outline + VLESS Безлимит',
		type: 'both',
		dataLimitGB: 0,
		dataLimit: 0,
		duration: 30,
		price: 1150,               // vs 650+800=1450, скидка 21%
		emoji: '🔱'
	}
};

const KEY_STATUS = {
	ACTIVE: 'active',
	EXPIRED: 'expired',
	SUSPENDED: 'suspended',
	PENDING: 'pending'
};

const KEY_TYPE = {
	OUTLINE: 'outline',
	VLESS: 'vless',
	BOTH: 'both'
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
			PENDING: 'admin_keys_pending_menu'
		},
		PAYMENTS: { MENU: 'admin_payments' },
		STATS: { MENU: 'admin_stats_menu' },
		USERS: { MENU: 'admin_users_menu' },
		WITHDRAWALS: { PENDING: 'admin_withdrawals_pending' },
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
		VPN_APPS_OUTLINE: 'vpn_apps_outline',
		VPN_APPS_VLESS: 'vpn_apps_vless',
		VLESS_APPS_LINUX: 'vless_apps_linux',
		VLESS_APPS_WINDOWS: 'vless_apps_windows',
		VLESS_APPS_MACOS: 'vless_apps_macos',
		VLESS_APPS_IOS: 'vless_apps_ios',
		VLESS_APPS_ANDROID: 'vless_apps_android',
		HOW_TO_ADD_KEY: 'how_to_add_key',
		HOW_TO_ADD_KEY_OUTLINE: 'how_to_add_key_outline',
		HOW_TO_ADD_KEY_VLESS: 'how_to_add_key_vless',
		SUPPORT: 'support',
		RETRY: 'retry'
	},
	KEYS: {
		MENU: 'keys_menu',
		BUY: 'keys_buy',
		DETAILS: 'key_details',
		STATS: 'key_stats',
		REFRESH: 'key_refresh',
		CHECKOUT: 'checkout',
		// Выбор типа подключения
		SELECT_TYPE: 'keys_select_type',
		TYPE_OUTLINE: 'plans_type_outline',
		TYPE_VLESS: 'plans_type_vless',
		TYPE_BOTH: 'plans_type_both'
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
		}
	},
	REFERRAL: {
		MENU: 'referral_menu',
		INVITE: 'referral_invite',
		GET_LINK: 'referral_get_link',
		WITHDRAW: 'referral_withdraw',
		CONFIRM_WITHDRAW: 'referral_confirm_withdraw',
		MY_REFERRALS: 'referral_my_referrals',
		HISTORY: 'referral_history'
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
	REFERRAL_CONFIG,
	ADMIN_IDS
};
