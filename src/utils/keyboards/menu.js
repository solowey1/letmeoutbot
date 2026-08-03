const { Markup } = require('../markup');
const { btn } = require('./common');

function createMainMenu(t, isAdmin = false, showGift = false) {
	const buttons = [
		[btn(t, 'buy')],
		[btn(t, 'buy_proxy')],
		[btn(t, 'buy_px6')],
		[btn(t, 'my_keys')],
		[btn(t, 'help')],
		[btn(t, 'referral')],
		[btn(t, 'settings')],
	];

	if (showGift) {
		buttons.push([btn(t, 'gift_info')]);
	}

	if (isAdmin) {
		buttons.push([btn(t, 'admin')]);
	}

	return Markup.inlineKeyboard(buttons);
}

module.exports = {
	createMainMenu
};
