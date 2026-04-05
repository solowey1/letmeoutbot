const { CALLBACK_ACTIONS, COMBO_DISCOUNT } = require('./constants');

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

	// ── Покупка / Оплата ────────────────────────────────────────────
	buy:             { text: 'buttons.buy.key',                     action: CALLBACK_ACTIONS.KEYS.BUY,               style: 'primary',   icon: '5427168083074628963' },
	buy_first:       { text: 'buttons.buy.first',                   action: CALLBACK_ACTIONS.KEYS.BUY,               style: 'primary',   icon: '5427168083074628963' },
	buy_more:        { text: 'buttons.buy.more',                    action: CALLBACK_ACTIONS.KEYS.BUY,               style: 'primary',   icon: '5427168083074628963' },
	pay:             { text: 'buttons.pay',                         action: null,                                    style: 'primary',   icon: '5895708410447401643' },
	confirm:         { text: 'buttons.confirm_purchase',            action: null,                                    style: 'success',   icon: '5774022692642492953' },
	cancel:          { text: 'buttons.cancel',                      action: null,                                    style: 'danger',    icon: '5774077015388852135' },

	// ── Ключи ───────────────────────────────────────────────────────
	stats:           { text: 'buttons.stats',                       action: null,                                    style: null,        icon: '5936143551854285132' },
	refresh_key:     { text: 'buttons.refresh_key',                 action: null,                                    style: null,        icon: '6030657343744644592' },

	// ── Помощь / Приложения ─────────────────────────────────────────
	vpn_apps:        { text: 'buttons.vpn_apps',                    action: CALLBACK_ACTIONS.BASIC.VPN_APPS,         style: null,        icon: '5963087934696459905' },
	how_to_add_key:  { text: 'buttons.how_to_add_key',              action: CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY,   style: null,        icon: '6030848053177486888' },
	contact_support: { text: 'buttons.contact_support', method: 'url', url: 'https://t.me/letmeoutsupportbot',       style: null,        icon: '6021618194228187816' },

	// ── Выбор типа подключения ──────────────────────────────────────
	type_outline:    { text: 'buttons.type_outline',                action: CALLBACK_ACTIONS.KEYS.TYPE_OUTLINE,      style: null,        icon: null },
	type_vless:      { text: 'buttons.type_vless',                  action: CALLBACK_ACTIONS.KEYS.TYPE_VLESS,        style: null,        icon: null },
	type_both:       { text: 'buttons.type_both',                   action: CALLBACK_ACTIONS.KEYS.TYPE_BOTH,         style: null,        icon: null, params: { discount: Math.round(COMBO_DISCOUNT * 100) } },

	// ── Протоколы (для помощи / приложений) ─────────────────────────
	outline:         { text: 'buttons.protocols.outline',           action: null,                                    style: null,        icon: null },
	vless:           { text: 'buttons.protocols.vless',             action: null,                                    style: null,        icon: null },

	// ── Outline: ссылки на приложения ───────────────────────────────
	outline_app_website: { text: 'buttons.apps.website', method: 'url', url: 'https://getoutline.org/ru/get-started/#step-3',                             						style: null, icon: '5776233299424843260' },
	outline_app_android: { text: 'buttons.apps.android', method: 'url', url: 'https://play.google.com/store/apps/details?id=org.outline.android.client',  						style: null, icon: '6030400221232501136' },
	outline_app_ios:     { text: 'buttons.apps.ios',     method: 'url', url: 'https://apps.apple.com/app/outline-app/id1356177741',                       						style: null, icon: '5775870512127283512' },
	outline_app_windows: { text: 'buttons.apps.windows', method: 'url', url: 'https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe', 		style: null, icon: '5837069325034331827' },
	outline_app_macos:   { text: 'buttons.apps.macos',   method: 'url', url: 'https://s3.amazonaws.com/outline-releases/client/macos/stable/Outline-Client.dmg', 			style: null, icon: '5942734685976138521' },
	outline_app_linux:   { text: 'buttons.apps.linux',   method: 'url', url: 'https://s3.amazonaws.com/outline-releases/client/linux/stable/Outline-Client.AppImage', style: null, icon: '5323366978457445319' },

	// ── ОС (VLESS приложения) ───────────────────────────────────────
	vless_app_android:   { text: 'buttons.apps.android',                  action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_ANDROID, style: null,      icon: '6030400221232501136' },
	vless_app_ios:       { text: 'buttons.apps.ios',                      action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_IOS,     style: null,      icon: '5775870512127283512' },
	vless_app_windows:   { text: 'buttons.apps.windows',                  action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_WINDOWS, style: null,      icon: '5837069325034331827' },
	vless_app_macos:     { text: 'buttons.apps.macos',                    action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_MACOS,   style: null,      icon: '5942734685976138521' },
	vless_app_linux:     { text: 'buttons.apps.linux',                    action: CALLBACK_ACTIONS.BASIC.VLESS_APPS_LINUX,   style: null,      icon: '5323366978457445319' },

	// ── Настройки ───────────────────────────────────────────────────
	language:        { text: 'buttons.language',                    action: CALLBACK_ACTIONS.SETTINGS.LANGUAGE.SET,   style: null,        icon: '5769403725898584391' },
	lang_ru:         { text: 'buttons.languages.russian',           action: CALLBACK_ACTIONS.SETTINGS.LANGUAGE.RU,    style: null,        icon: '5398017006165305287' },
	lang_en:         { text: 'buttons.languages.english',           action: CALLBACK_ACTIONS.SETTINGS.LANGUAGE.EN,    style: null,        icon: '5458416160586342331' },

	// ── Админка ─────────────────────────────────────────────────────
	admin:           { text: 'buttons.admin_panel',                 action: CALLBACK_ACTIONS.ADMIN.MENU,             style: 'danger',    icon: '5805553606635559688' },
	admin_users:     { text: 'buttons.admin.users',                 action: CALLBACK_ACTIONS.ADMIN.USERS.MENU,       style: null,        icon: '6032609071373226027' },
	admin_stats:     { text: 'buttons.admin.stats',                 action: CALLBACK_ACTIONS.ADMIN.STATS.MENU,       style: null,        icon: '5938539885907415367' },
	admin_payments:  { text: 'buttons.admin.payments',              action: CALLBACK_ACTIONS.ADMIN.PAYMENTS.MENU,    style: null,        icon: '5769126056262898415' },
	admin_keys:      { text: 'buttons.admin.keys',                  action: CALLBACK_ACTIONS.ADMIN.KEYS.MENU,        style: null,        icon: '5766994197705921104' },
	admin_pending_keys: { text: 'buttons.admin.pending_keys',       action: CALLBACK_ACTIONS.ADMIN.KEYS.PENDING,     style: null,        icon: '5368324170671202286' },
	admin_withdrawals: { text: 'buttons.admin.pending_withdrawals', action: CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.PENDING, style: null,     icon: '5805331990618053402' },
	admin_broadcast: { text: 'buttons.admin.broadcast',             action: CALLBACK_ACTIONS.ADMIN.BROADCAST,        style: null,        icon: '6030329749409108167' },
	admin_settings:  { text: 'buttons.admin.settings',              action: CALLBACK_ACTIONS.ADMIN.SETTINGS,         style: null,        icon: '5850332476102153487' },

	// ── Рассылка: аудитория ─────────────────────────────────────────
	broadcast_all:       { text: 'buttons.admin.broadcast_all',         action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.ALL,     style: null, icon: '6032594876506312598' },
	broadcast_active:    { text: 'buttons.admin.broadcast_active',      action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.ACTIVE,  style: null, icon: '5879905000972358125' },
	broadcast_buyers:    { text: 'buttons.admin.broadcast_buyers',      action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.BUYERS,  style: null, icon: '6035084557378654059' },
	broadcast_non_buyers: { text: 'buttons.admin.broadcast_non_buyers', action: CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.NON_BUYERS, style: null, icon: '5893192487324880883' },

	// ── Рассылка: управление ────────────────────────────────────────
	broadcast_new:           { text: 'buttons.admin.broadcast_new',                          action: 'broadcast_new',            											 style: null,			 	icon: '6035305550625902723' },
	broadcast_history:       { text: 'buttons.admin.broadcast_history',                      action: 'broadcast_history',											         style: null,			 	icon: '5776182936638329359' },
	broadcast_schedule:      { text: 'buttons.admin.broadcast_schedule',                     action: 'broadcast_schedule',										         style: null,			 	icon: '5983401171501454028' },
	broadcast_confirm_send:  { text: 'buttons.confirm_purchase',                             action: 'broadcast_confirm_send',											   style: 'success',	icon: '5774022692642492953' },
	broadcast_filter_all:         { text: 'admin.broadcast.filters.all',           params: { ns: 'message' }, action: 'broadcast_filter_all',          style: null,			 	icon: '6032594876506312598' },
	broadcast_filter_active_keys: { text: 'admin.broadcast.filters.active_keys',   params: { ns: 'message' }, action: 'broadcast_filter_active_keys',  style: null,			 	icon: '5886685105065300941' },
	broadcast_filter_expired_keys: { text: 'admin.broadcast.filters.expired_keys', params: { ns: 'message' }, action: 'broadcast_filter_expired_keys', style: null,			 	icon: '5938071395169734715' },
	broadcast_filter_no_keys:     { text: 'admin.broadcast.filters.no_keys',       params: { ns: 'message' }, action: 'broadcast_filter_no_keys',      style: null,			 	icon: '5938342819922973434' },
	broadcast_filter_paid_users:  { text: 'admin.broadcast.filters.paid_users',    params: { ns: 'message' }, action: 'broadcast_filter_paid_users',   style: null,			 	icon: '6035084557378654059' },
	broadcast_filter_free_users:  { text: 'admin.broadcast.filters.free_users',    params: { ns: 'message' }, action: 'broadcast_filter_free_users',   style: null,			 	icon: '5893192487324880883' },
	broadcast_filter_new_users:   { text: 'admin.broadcast.filters.new_users',     params: { ns: 'message' }, action: 'broadcast_filter_new_users',    style: null,			 	icon: '6033108709213736873' },
	broadcast_lang_ru:   { text: 'admin.broadcast.language_ru',  params: { ns: 'message' }, action: 'broadcast_lang_ru',															 style: null,			 	icon: '5398017006165305287' },
	broadcast_lang_en:   { text: 'admin.broadcast.language_en',  params: { ns: 'message' }, action: 'broadcast_lang_en',															 style: null,			 	icon: '5458416160586342331' },
	broadcast_lang_all:  { text: 'admin.broadcast.language_all', params: { ns: 'message' }, action: 'broadcast_lang_all',															 style: null,			 	icon: '5769403725898584391' },

	// ── Реферальная программа ────────────────────────────────────────
	ref_get_link:    { text: 'buttons.referral_actions.get_link',   action: CALLBACK_ACTIONS.REFERRAL.GET_LINK,      style: null,        icon: '6028171274939797252' },
	ref_my_referrals: { text: 'buttons.referral_actions.my_referrals', action: CALLBACK_ACTIONS.REFERRAL.MY_REFERRALS, style: null,      icon: '6032609071373226027' },
	// ref_invite:   { text: 'buttons.referral_actions.invite',     action: CALLBACK_ACTIONS.REFERRAL.INVITE,        style: null,        icon: '6037622221625626773' },  // не используется — см. ref_invite_share (switchToChat)
	ref_invite_share: { text: 'buttons.referral_actions.invite', method: 'switchToChat', value: '',                   style: null,        icon: '6037622221625626773' },
	ref_withdraw:    { text: 'buttons.referral_actions.withdraw',   action: CALLBACK_ACTIONS.REFERRAL.WITHDRAW,      style: null,        icon: '5890848474563352982' },
	ref_history:     { text: 'buttons.referral_actions.history',    action: CALLBACK_ACTIONS.REFERRAL.HISTORY,       style: null,        icon: '5904359114531675993' },
};

module.exports = { BUTTON_PRESETS };
