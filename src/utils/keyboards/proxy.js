const { Markup } = require('../markup');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const PlanService = require('../../services/PlanService');
const { btn } = require('./common');

function createProxyPlansKeyboard(t, plans) {
	const buttons = plans.map(plan => {
		const formatted = PlanService.formatPlanForDisplay(t, plan);
		const button = Markup.button.callback(
			`${plan.price} — ${formatted.displayDuration}`,
			`${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${plan.id}`
		);
		button.icon_custom_emoji_id = '5920433463428650761';
		return [button];
	});

	buttons.push([btn(t, 'home')]);

	return Markup.inlineKeyboard(buttons);
}

function createProxyConnectKeyboard(t, tgLink) {
	return Markup.inlineKeyboard([
		[btn(t, 'connect_proxy', tgLink)],
		[btn(t, 'my_keys')]
	]);
}

module.exports = {
	createProxyPlansKeyboard,
	createProxyConnectKeyboard
};
