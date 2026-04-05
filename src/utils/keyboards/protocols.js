const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createHowToAddKeyKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'outline', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_OUTLINE)],
		[btn(t, 'vless', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_VLESS)],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
			btn(t, 'home')
		]
	]);
}

function createHowToAddKeyBackKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY),
			btn(t, 'home')
		]
	]);
}

function createVpnAppsProtocolKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'outline', CALLBACK_ACTIONS.BASIC.VPN_APPS_OUTLINE)],
		[btn(t, 'vless', CALLBACK_ACTIONS.BASIC.VPN_APPS_VLESS)],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
			btn(t, 'home')
		]
	]);
}

function createOutlineAppsKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'outline_app_website')],
		[btn(t, 'outline_app_android'), btn(t, 'outline_app_ios')],
		[btn(t, 'outline_app_windows'), btn(t, 'outline_app_macos')],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS),
			btn(t, 'home')
		]
	]);
}

function createVlessOsKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'os_android')],
		[btn(t, 'os_ios')],
		[btn(t, 'os_windows')],
		[btn(t, 'os_macos')],
		[btn(t, 'os_linux')],
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
	createHowToAddKeyBackKeyboard,
	createVpnAppsProtocolKeyboard,
	createOutlineAppsKeyboard,
	createVlessOsKeyboard,
	createVlessAppsBackKeyboard
};
