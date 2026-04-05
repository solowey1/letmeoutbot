const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createHelpKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'buy')],
		[btn(t, 'vpn_apps')],
		[btn(t, 'how_to_add_key')],
		[btn(t, 'contact_support')],
		[btn(t, 'home')]
	]);
}

function createSupportKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'contact_support')],
		[
			btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
			btn(t, 'home')
		]
	]);
}

module.exports = {
	createHelpKeyboard,
	createSupportKeyboard
};
