const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createWithdrawalAdminKeyboard(withdrawalId) {
	return Markup.inlineKeyboard([
		[
			Markup.button.callback('✅ Выплатить', `${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.APPROVE}_${withdrawalId}`),
			Markup.button.callback('❌ Отклонить', `${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.REJECT}_${withdrawalId}`),
		]
	]);
}

function createAdminKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'admin_users')
		],
		[
			btn(t, 'admin_stats'),
			btn(t, 'admin_keys'),
		],
		[
			btn(t, 'admin_pending_keys'),
		],
		[
			btn(t, 'admin_payments'),
			btn(t, 'admin_withdrawals'),
		],
		[
			btn(t, 'admin_broadcast'),
		],
		[
			btn(t, 'admin_settings')
		],
		[btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOME)]
	]);
}

module.exports = {
	createAdminKeyboard,
	createWithdrawalAdminKeyboard,
};
