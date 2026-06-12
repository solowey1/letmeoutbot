const { Markup } = require('telegraf');
const { btn } = require('./common');

function createMainMenu(t, isAdmin = false, showGift = false) {
	const buttons = [
		[btn(t, 'buy')],
		[btn(t, 'my_keys')],
		[btn(t, 'help')],
		[btn(t, 'referral')],
		[btn(t, 'settings')],
	];

	if (showGift) {
		buttons.splice(1, 0, [btn(t, 'gift_info')]);
	}

	if (isAdmin) {
		buttons.push([btn(t, 'admin')]);
	}

	return Markup.inlineKeyboard(buttons);
}

module.exports = {
	createMainMenu
};
