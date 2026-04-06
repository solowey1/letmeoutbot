const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS, KEY_TYPE, OS_VARIANTS } = require('../../config/constants');
const { btn } = require('./common');

// ══════════════════════════════════════════════
// Путь: Помощь → Как добавить ключ
// ══════════════════════════════════════════════

function createHowToAddKeyKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, KEY_TYPE.OUTLINE, CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_OUTLINE)],
		[btn(t, KEY_TYPE.VLESS, CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_VLESS)],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
			btn(t, 'home')
		]
	]);
}

function createHowToAddKeyProtocolKeyboard(t, protocol) {
	const appsAction = protocol === KEY_TYPE.OUTLINE
		? CALLBACK_ACTIONS.BASIC.HOWTO_APPS_OUTLINE
		: CALLBACK_ACTIONS.BASIC.HOWTO_APPS_VLESS;

	return Markup.inlineKeyboard([
		[btn(t, 'vpn_apps', appsAction)],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY),
			btn(t, 'home')
		]
	]);
}

// Приложения Outline (из "Как добавить ключ → Outline")
function createHowtoOutlineAppsKeyboard(t) {
	const buttons = Object.values(OS_VARIANTS)
		.map(os => [btn(t, `${KEY_TYPE.OUTLINE}_app_${os}`)]);

	return Markup.inlineKeyboard([
		...buttons,
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_OUTLINE),
			btn(t, 'home')
		]
	]);
}

// Выбор ОС для VLESS (из "Как добавить ключ → VLESS")
function createHowtoVlessOsKeyboard(t) {
	const buttons = Object.values(OS_VARIANTS)
		.filter(os => os !== OS_VARIANTS.WEBSITE)
		.map(os => [btn(t, `${KEY_TYPE.VLESS}_app_${os}`, CALLBACK_ACTIONS.BASIC[`HOWTO_VLESS_APPS_${os.toUpperCase()}`])]);

	return Markup.inlineKeyboard([
		...buttons,
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_VLESS),
			btn(t, 'home')
		]
	]);
}

// Список приложений VLESS для ОС (из "Как добавить ключ → VLESS → ОС")
function createHowtoVlessAppsBackKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOWTO_APPS_VLESS),
			btn(t, 'home')
		]
	]);
}

// ══════════════════════════════════════════════
// Путь: Помощь → Приложения для VPN
// ══════════════════════════════════════════════

function createVpnAppsProtocolKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, KEY_TYPE.OUTLINE, CALLBACK_ACTIONS.BASIC.VPN_APPS_OUTLINE)],
		[btn(t, KEY_TYPE.VLESS, CALLBACK_ACTIONS.BASIC.VPN_APPS_VLESS)],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
			btn(t, 'home')
		]
	]);
}

function createOutlineAppsKeyboard(t) {
	const buttons = Object.values(OS_VARIANTS)
		.map(os => [btn(t, `${KEY_TYPE.OUTLINE}_app_${os}`)]);

	return Markup.inlineKeyboard([
		...buttons,
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS),
			btn(t, 'home')
		]
	]);
}

function createVlessOsKeyboard(t) {
	const buttons = Object.values(OS_VARIANTS)
		.filter(os => os !== OS_VARIANTS.WEBSITE)
		.map(os => [btn(t, `${KEY_TYPE.VLESS}_app_${os}`)]);

	return Markup.inlineKeyboard([
		...buttons,
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS),
			btn(t, 'home')
		]
	]);
}

function createVlessAppsBackKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS_VLESS),
			btn(t, 'home')
		]
	]);
}

module.exports = {
	createHowToAddKeyKeyboard,
	createHowToAddKeyProtocolKeyboard,
	createHowtoOutlineAppsKeyboard,
	createHowtoVlessOsKeyboard,
	createHowtoVlessAppsBackKeyboard,
	createVpnAppsProtocolKeyboard,
	createOutlineAppsKeyboard,
	createVlessOsKeyboard,
	createVlessAppsBackKeyboard
};
