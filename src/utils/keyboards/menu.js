const { Markup } = require('telegraf');
const { btn } = require('./common');

function createMainMenu(t, isAdmin = false) {
	const buttons = [
		[btn(t, 'buy')],
		[btn(t, 'my_keys')],
		[btn(t, 'referral')],
		[btn(t, 'settings')],
	];

	if (isAdmin) {
		buttons.push([btn(t, 'admin')]);
	}

	buttons.push([btn(t, 'help')]);

	return Markup.inlineKeyboard(buttons);
}

module.exports = {
	createMainMenu
};
