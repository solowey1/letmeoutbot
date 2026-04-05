const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const PlanService = require('../../services/PlanService');
const { btn } = require('./common');

function createTypeSelectionKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'type_outline'),
			btn(t, 'type_vless')
		],
		[btn(t, 'type_both')],
		[btn(t, 'home')]
	]);
}

function createPlansKeyboardByType(t, plans, type) {
	const buttons = plans.map(plan => {
		const limit = plan.dataLimitGB > 0 ? `${plan.dataLimitGB} ${t('common.memory.gb')}` : t('plans.unlimited');
		const button = Markup.button.callback(
			`${plan.price} — ${plan.emoji} ${limit}`,
			`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_${plan.id}`
		);
		button.icon_custom_emoji_id = '5920433463428650761';
		return [button];
	});

	buttons.push([
		btn(t, 'back', CALLBACK_ACTIONS.KEYS.BUY),
		btn(t, 'home')
	]);

	return Markup.inlineKeyboard(buttons);
}

function createPlansKeyboard(t, isAdmin = false) {
	const plans = PlanService.getAllPlans(isAdmin);
	const buttons = [];

	plans.forEach(plan => {
		const formatted = PlanService.formatPlanForDisplay(t, plan);
		const button = Markup.button.callback(
			`${formatted.displayName} - ${formatted.displayPrice}`,
			`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_${plan.id}`
		);
		buttons.push([button]);
	});

	buttons.push([btn(t, 'home')]);

	return Markup.inlineKeyboard(buttons);
}

function createPlanDetailsKeyboard(t, planId, planType) {
	return Markup.inlineKeyboard([
		[btn(t, 'pay', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
		[
			btn(t, 'back', `plans_type_${planType}`),
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

function createDirectCheckoutKeyboard(t, planId) {
	return Markup.inlineKeyboard([
		[btn(t, 'pay', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
		[btn(t, 'back', CALLBACK_ACTIONS.KEYS.BUY)]
	]);
}

function createAppsDownloadKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'vpn_apps')],
		[btn(t, 'my_keys')]
	]);
}

module.exports = {
	createTypeSelectionKeyboard,
	createPlansKeyboardByType,
	createPlansKeyboard,
	createPlanDetailsKeyboard,
	createPaymentConfirmationKeyboard,
	createDirectCheckoutKeyboard,
	createAppsDownloadKeyboard
};
