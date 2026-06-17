const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createWithdrawalAdminKeyboard(t, withdrawalId) {
	return Markup.inlineKeyboard([
		[
			Markup.button.callback(t('buttons.admin.withdrawal_approve'), `${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.APPROVE}_${withdrawalId}`),
			Markup.button.callback(t('buttons.admin.withdrawal_reject'), `${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.REJECT}_${withdrawalId}`),
		],
		[
			Markup.button.callback(t('buttons.admin.withdrawal_back_to_list'), CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.PENDING),
		]
	]);
}

function createWithdrawalListKeyboard(t, withdrawals) {
	const rows = [];
	for (let i = 0; i < withdrawals.length; i += 4) {
		rows.push(
			withdrawals.slice(i, i + 4).map((w, idx) =>
				Markup.button.callback(`#${i + idx + 1}`, `${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.VIEW}_${w.id}`)
			)
		);
	}
	rows.push([btn(t, 'back', CALLBACK_ACTIONS.ADMIN.MENU)]);
	return Markup.inlineKeyboard(rows);
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
	createWithdrawalListKeyboard,
};
