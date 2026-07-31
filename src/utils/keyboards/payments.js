const { Markup } = require('../markup');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createPlansKeyboard(t, plans) {
	const buttons = plans.map(plan => {
		const limit = plan.dataLimitGB > 0 ? `${plan.dataLimitGB} ${t('common.memory.gb')}` : t('plans.unlimited');
		const button = Markup.button.callback(
			`${plan.price} — ${limit}`,
			`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_${plan.id}`
		);
		button.icon_custom_emoji_id = '5920433463428650761';
		return [button];
	});

	buttons.push([btn(t, 'home')]);

	return Markup.inlineKeyboard(buttons);
}

function createPlanDetailsKeyboard(t, planId) {
	return Markup.inlineKeyboard([
		[btn(t, 'pay', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
		[
			btn(t, 'back', CALLBACK_ACTIONS.KEYS.BUY),
			btn(t, 'home')
		]
	]);
}

function createPaymentConfirmationKeyboard(t, planId) {
	return Markup.inlineKeyboard([
		[btn(t, 'confirm', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
		[btn(t, 'cancel', CALLBACK_ACTIONS.KEYS.BUY)]
	]);
}

function createAppsDownloadKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'vpn_apps')],
		[btn(t, 'my_keys')]
	]);
}

module.exports = {
	createPlansKeyboard,
	createPlanDetailsKeyboard,
	createPaymentConfirmationKeyboard,
	createAppsDownloadKeyboard
};
