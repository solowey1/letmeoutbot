const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS, OS_VARIANTS } = require('../../config/constants');
const { btn } = require('./common');

// ══════════════════════════════════════════════
// Путь: Помощь → Как добавить ключ
// ══════════════════════════════════════════════

function createHowToAddKeyKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'vpn_apps', CALLBACK_ACTIONS.BASIC.HOWTO_APPS)],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
			btn(t, 'home')
		]
	]);
}

function createHowtoVlessOsKeyboard(t) {
	const buttons = Object.values(OS_VARIANTS)
		.filter(os => os !== OS_VARIANTS.WEBSITE)
		.map(os => [btn(t, `vless_app_${os}`, CALLBACK_ACTIONS.BASIC[`HOWTO_VLESS_APPS_${os.toUpperCase()}`])]);

	return Markup.inlineKeyboard([
		...buttons,
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY),
			btn(t, 'home')
		]
	]);
}

function createHowtoVlessAppsBackKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOWTO_APPS),
			btn(t, 'home')
		]
	]);
}

// ══════════════════════════════════════════════
// Путь: Помощь → Приложения для VPN
// ══════════════════════════════════════════════

function createVlessOsKeyboard(t) {
	const buttons = Object.values(OS_VARIANTS)
		.filter(os => os !== OS_VARIANTS.WEBSITE)
		.map(os => [btn(t, `vless_app_${os}`)]);

	return Markup.inlineKeyboard([
		...buttons,
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
			btn(t, 'home')
		]
	]);
}

function createVlessAppsBackKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS),
			btn(t, 'home')
		]
	]);
}

module.exports = {
	createHowToAddKeyKeyboard,
	createHowtoVlessOsKeyboard,
	createHowtoVlessAppsBackKeyboard,
	createVlessOsKeyboard,
	createVlessAppsBackKeyboard
};
