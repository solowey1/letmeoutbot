const { CALLBACK_ACTIONS } = require('./constants');

/**
 * Пресеты кнопок — единое место управления текстом, действием, стилем и иконкой.
 *
 * method — тип кнопки Telegraf: 'callback' (по умолчанию) | 'url' | 'switchToChat'
 * text   — ключ локализации (передаётся в t())
 * action — callback_data (для method='callback')
 * url    — URL (для method='url')
 * value  — inline query (для method='switchToChat')
 * style  — стиль кнопки (null | 'primary' | 'success' | 'danger')
 * icon   — ID кастомной иконки Telegram (null = без иконки)
 * params — параметры интерполяции для t() (опционально)
 */
const BUTTON_PRESETS = {
	// ── Навигация ───────────────────────────────────────────────────
	home:            { text: 'buttons.home',                        action: CALLBACK_ACTIONS.BASIC.HOME,             style: null,        icon: '6042137469204303531' },
	back:            { text: 'buttons.back',                        action: null,                                    style: null,        icon: '5960671702059848143' },

	// ── Пагинация ───────────────────────────────────────────────────
	page_prev:       { text: 'buttons.pagination.prev',             action: null,                                    style: null,        icon: '6039539366177541657' },
	page_next:       { text: 'buttons.pagination.next',             action: null,                                    style: null,        icon: '6037622221625626773' },

	// ── Главное меню ────────────────────────────────────────────────
	my_keys:         { text: 'buttons.my_keys',                     action: CALLBACK_ACTIONS.KEYS.MENU,              style: null,        icon: '5766994197705921104' },
	referral:        { text: 'buttons.referral',                    action: CALLBACK_ACTIONS.REFERRAL.MENU,          style: null,        icon: '5879905000972358125' },
	settings:        { text: 'buttons.settings',                    action: CALLBACK_ACTIONS.SETTINGS.MENU,          style: null,        icon: '5904258298764334001' },
	help:            { text: 'buttons.help',                        action: CALLBACK_ACTIONS.BASIC.HELP,             style: null,        icon: '6028435952299413210' },
	// support:      { text: 'buttons.support',                     action: CALLBACK_ACTIONS.BASIC.SUPPORT,          style: null,        icon: '6021618194228187816' },  // не используется — см. contact_support (url)
	retry:           { text: 'buttons.retry',                       action: CALLBACK_ACTIONS.BASIC.RETRY,            style: null,        icon: '5850346984501680054' },

	// ── Покупка / Оплата ─────────────────────────────────────────────
	buy:             { text: 'buttons.buy.key',                     action: CALLBACK_ACTIONS.KEYS.BUY,               style: 'primary',   icon: '5427168083074628963' },
	buy_first:       { text: 'buttons.buy.first',                   action: CALLBACK_ACTIONS.KEYS.BUY,               style: 'primary',   icon: '5427168083074628963' },
	buy_more:        { text: 'buttons.buy.more',                    action: CALLBACK_ACTIONS.KEYS.BUY,               style: 'primary',   icon: '5427168083074628963' },
	buy_proxy:       { text: 'buttons.buy.proxy',                   action: CALLBACK_ACTIONS.PROXY.MENU,             style: null,   		 icon: '6030445631921721471' },
	pay:             { text: 'buttons.pay',                         action: null,                                    style: 'primary',   icon: '5895708410447401643' },
	confirm:         { text: 'buttons.confirm',            					action: null,                                    style: 'success',   icon: '5774022692642492953' },
	cancel:          { text: 'buttons.cancel',                      action: null,                                    style: 'danger',    icon: '5774077015388852135' },

	// ── Ключи ───────────────────────────────────────────────────────
	stats:           { text: 'buttons.stats',                       action: null,                                    style: null,        icon: '5936143551854285132' },
	raw_vless_key:   { text: 'buttons.raw_vless_key',               action: null,                                    style: null,        icon: '5884491244360438851' },

	// ── Помощь / Приложения ─────────────────────────────────────────
	vpn_apps:        { text: 'buttons.vpn_apps',                    action: CALLBACK_ACTIONS.BASIC.VPN_APPS,         style: null,        icon: '5963087934696459905' },
	how_to_add_key:  { text: 'buttons.how_to_add_key',              action: CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY,   style: null,        icon: '6030848053177486888' },
	how_to_add_proxy:{ text: 'buttons.how_to_add_proxy',            action: CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_PROXY, style: null,        icon: '6030445631921721471' },
	contact_support: { text: 'buttons.contact_support', method: 'url', url: 'https://t.me/letmeoutsupportbot',       style: null,        icon: '6021618194228187816' },
	connect_proxy:   { text: 'buttons.connect_proxy',               method: 'url', url: '',                          style: 'primary',   icon: '6028338546736107668' },

	// ── ОС (VLESS приложения) ───────────────────────────────────────
	vless_app_android:   { text: 'buttons.apps.android',                  action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_ANDROID, style: null,      icon: '6030400221232501136' },
	vless_app_ios:       { text: 'buttons.apps.ios',                      action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_IOS,     style: null,      icon: '5775870512127283512' },
	vless_app_windows:   { text: 'buttons.apps.windows',                  action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_WINDOWS, style: null,      icon: '5837069325034331827' },
	vless_app_macos:     { text: 'buttons.apps.macos',                    action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_MACOS,   style: null,      icon: '5942734685976138521' },
	vless_app_linux:     { text: 'buttons.apps.linux',                    action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_LINUX,   style: null,      icon: '5323366978457445319' },

	// ── Настройки ───────────────────────────────────────────────────
	language:        { text: 'buttons.language',                    action: CALLBACK_ACTIONS.SETTINGS.LANGUAGE.SET,   style: null,        icon: '5769403725898584391' },
	settings_ton:    { text: 'buttons.settings_ton',                action: CALLBACK_ACTIONS.SETTINGS.TON_WALLET,     style: null,        icon: '5769406891289481208' },
	lang_ru:         { text: 'buttons.languages.russian',           action: CALLBACK_ACTIONS.SETTINGS.LANGUAGE.RU,    style: null,        icon: '5398017006165305287' },
	lang_en:         { text: 'buttons.languages.english',           action: CALLBACK_ACTIONS.SETTINGS.LANGUAGE.EN,    style: null,        icon: '5458416160586342331' },

	// ── Админка ─────────────────────────────────────────────────────
	admin:           		{ text: 'buttons.admin_panel',               action: CALLBACK_ACTIONS.ADMIN.MENU,             	 style: 'danger',    icon: '5805553606635559688' },
	admin_users:     		{ text: 'buttons.admin.users',               action: CALLBACK_ACTIONS.ADMIN.USERS.MENU,       	 style: null,        icon: '6032609071373226027' },
	admin_stats:     		{ text: 'buttons.admin.stats',               action: CALLBACK_ACTIONS.ADMIN.STATS.MENU,       	 style: null,        icon: '5938539885907415367' },
	admin_payments:  		{ text: 'buttons.admin.payments',            action: CALLBACK_ACTIONS.ADMIN.PAYMENTS.MENU,    	 style: null,        icon: '5769126056262898415' },
	admin_keys:     	 	{ text: 'buttons.admin.keys',                action: CALLBACK_ACTIONS.ADMIN.KEYS.MENU,        	 style: null,        icon: '5766994197705921104' },
	admin_pending_keys: { text: 'buttons.admin.pending_keys',        action: CALLBACK_ACTIONS.ADMIN.KEYS.PENDING,     	 style: null,        icon: '5891211339170326418' },
	admin_withdrawals: 	{ text: 'buttons.admin.pending_withdrawals', action: CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.PENDING, style: null,     icon: '5805331990618053402' },
	admin_broadcast: 		{ text: 'buttons.admin.broadcast',           action: CALLBACK_ACTIONS.ADMIN.BROADCAST,        	 style: null,        icon: '6030329749409108167' },
	admin_settings:  		{ text: 'buttons.admin.settings',            action: CALLBACK_ACTIONS.ADMIN.SETTINGS,         	 style: null,        icon: '5850332476102153487' },

	// ── Рассылка: аудитория ─────────────────────────────────────────
	broadcast_all:     	  { text: 'buttons.admin.broadcast_all',        action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.ALL,     		style: null, icon: '6032594876506312598' },
	broadcast_active:  	  { text: 'buttons.admin.broadcast_active',     action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.ACTIVE,  		style: null, icon: '5879905000972358125' },
	broadcast_buyers:    	{ text: 'buttons.admin.broadcast_buyers',     action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.BUYERS,  		style: null, icon: '6035084557378654059' },
	broadcast_non_buyers: { text: 'buttons.admin.broadcast_non_buyers', action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.NON_BUYERS, style: null, icon: '5893192487324880883' },

	// ── Рассылка: управление ────────────────────────────────────────
	broadcast_new:           				{ text: 'buttons.admin.broadcast_new',                          						action: 'broadcast_new',            		 style: null,			 	icon: '6035305550625902723' },
	broadcast_history:       				{ text: 'buttons.admin.broadcast_history',                      						action: 'broadcast_history',						 style: null,			 	icon: '5776182936638329359' },
	broadcast_schedule:      				{ text: 'buttons.admin.broadcast_schedule',                     						action: 'broadcast_schedule',						 style: null,			 	icon: '5983401171501454028' },
	broadcast_confirm_send:  				{ text: 'buttons.confirm',                             											action: 'broadcast_confirm_send',				 style: 'success',	icon: '5774022692642492953' },
	broadcast_filter_all:         	{ text: 'admin.broadcast.filters.all',           params: { ns: 'message' }, action: 'broadcast_filter_all',          style: null,			 	icon: '6032594876506312598' },
	broadcast_filter_active_keys: 	{ text: 'admin.broadcast.filters.active_keys',   params: { ns: 'message' }, action: 'broadcast_filter_active_keys',  style: null,			 	icon: '5886685105065300941' },
	broadcast_filter_expired_keys: 	{ text: 'admin.broadcast.filters.expired_keys',	 params: { ns: 'message' }, action: 'broadcast_filter_expired_keys', style: null,			 	icon: '5938071395169734715' },
	broadcast_filter_no_keys:     	{ text: 'admin.broadcast.filters.no_keys',       params: { ns: 'message' }, action: 'broadcast_filter_no_keys',      style: null,			 	icon: '5938342819922973434' },
	broadcast_filter_paid_users:  	{ text: 'admin.broadcast.filters.paid_users',    params: { ns: 'message' }, action: 'broadcast_filter_paid_users',   style: null,			 	icon: '6035084557378654059' },
	broadcast_filter_free_users:  	{ text: 'admin.broadcast.filters.free_users',    params: { ns: 'message' }, action: 'broadcast_filter_free_users',   style: null,			 	icon: '5893192487324880883' },
	broadcast_filter_new_users:   	{ text: 'admin.broadcast.filters.new_users',     params: { ns: 'message' }, action: 'broadcast_filter_new_users',    style: null,			 	icon: '6033108709213736873' },
	broadcast_lang_ru:   						{ text: 'buttons.languages.russian',						 params: { ns: 'main' },    action: 'broadcast_lang_ru',						 style: null,			 	icon: '5398017006165305287' },
	broadcast_lang_en:   						{ text: 'buttons.languages.english',						 params: { ns: 'main' },    action: 'broadcast_lang_en',						 style: null,			 	icon: '5458416160586342331' },
	broadcast_lang_all:  						{ text: 'buttons.languages.all',						 		 params: { ns: 'main' },    action: 'broadcast_lang_all',						 style: null,			 	icon: '5769403725898584391' },

	// ── Подарок ──────────────────────────────────────────────────────
	gift_info:   { text: 'buttons.gift',       action: CALLBACK_ACTIONS.GIFT.INFO,  style: 'success', icon: '6032644646587338669' },
	claim_gift:  { text: 'buttons.claim_gift', action: CALLBACK_ACTIONS.GIFT.CLAIM, style: 'success', icon: null },

	// ── Реферальная программа ────────────────────────────────────────
	ref_get_link:    	{ text: 'buttons.referral_actions.get_link',			action: CALLBACK_ACTIONS.REFERRAL.GET_LINK,			style: null, icon: '6028171274939797252' },
	ref_my_referrals: { text: 'buttons.referral_actions.my_referrals',	action: CALLBACK_ACTIONS.REFERRAL.MY_REFERRALS, style: null, icon: '6032609071373226027' },
	// ref_invite:   		{ text: 'buttons.referral_actions.invite',     		action: CALLBACK_ACTIONS.REFERRAL.INVITE,				style: null, icon: '6037622221625626773' },  // не используется — см. ref_invite_share (switchToChat)
	ref_invite_share: { text: 'buttons.referral_actions.invite',				method: 'switchToChat', value: '',							style: null, icon: '6037622221625626773' },
	ref_withdraw:    	{ text: 'buttons.referral_actions.withdraw',			action: CALLBACK_ACTIONS.REFERRAL.WITHDRAW,			style: null, icon: '5890848474563352982' },
	ref_history:     	{ text: 'buttons.referral_actions.history',				action: CALLBACK_ACTIONS.REFERRAL.HISTORY,			style: null, icon: '5904359114531675993' },
};

module.exports = { BUTTON_PRESETS };
