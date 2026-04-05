const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createAdminKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'admin_users')],
		[
			btn(t, 'admin_stats'),
			btn(t, 'admin_keys'),
		],
		[
			btn(t, 'admin_payments'),
			btn(t, 'admin_pending_keys'),
		],
		[
			btn(t, 'admin_withdrawals'),
			btn(t, 'admin_broadcast'),
		],
		[btn(t, 'admin_settings')],
		[btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOME)]
	]);
}

module.exports = {
	createAdminKeyboard
};
