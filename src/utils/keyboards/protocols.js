const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS, KEY_TYPE, OS_VARIANTS } = require('../../config/constants');
const { btn } = require('./common');

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
	return Markup.inlineKeyboard([
		[btn(t, 'vpn_apps', CALLBACK_ACTIONS.BASIC[`VPN_APPS_${protocol.toUpperCase()}`])],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY),
			btn(t, 'home')
		]
	]);
}

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
		.map(os => btn(t, `${KEY_TYPE.OUTLINE}_app_${os}`));

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
		.map(os => btn(t, `${KEY_TYPE.VLESS}_app_${os}`));

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
	createVpnAppsProtocolKeyboard,
	createOutlineAppsKeyboard,
	createVlessOsKeyboard,
	createVlessAppsBackKeyboard
};
