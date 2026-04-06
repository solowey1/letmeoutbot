const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const PlanService = require('../../services/PlanService');
const { btn } = require('./common');

function createKeysKeyboard(t, keys) {
	const buttons = [];

	if (keys && keys.length > 0) {
		keys.forEach((key) => {
			const plan = PlanService.getPlanById(key.plan_id);
			if (plan) {
				const formatted = PlanService.formatPlanForDisplay(t, plan);
				const style = key.status === 'active' ? 'success' : 'danger';
				const button = Markup.button.callback(
					formatted.displayName,
					`${CALLBACK_ACTIONS.KEYS.DETAILS}_${key.id}`
				);
				button.style = style;
				buttons.push([button]);
			}
		});

		buttons.push([btn(t, 'buy_more')]);
	} else {
		buttons.push([btn(t, 'buy_first')]);
	}

	buttons.push([btn(t, 'home')]);

	return Markup.inlineKeyboard(buttons);
}

function createKeyDetailsKeyboard(t, keyId, keyType) {
	const rows = [
		[btn(t, 'stats', `${CALLBACK_ACTIONS.KEYS.STATS}_${keyId}`)],
	];

	if (keyType !== 'vless') {
		rows.push([btn(t, 'refresh_key', `${CALLBACK_ACTIONS.KEYS.REFRESH}_${keyId}`)]);
	}

	rows.push([
		btn(t, 'back', CALLBACK_ACTIONS.KEYS.MENU),
		btn(t, 'home')
	]);

	return Markup.inlineKeyboard(rows);
}

function createKeyStatsKeyboard(t, keyId) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'back', `${CALLBACK_ACTIONS.KEYS.DETAILS}_${keyId}`),
			btn(t, 'home')
		]
	]);
}

module.exports = {
	createKeysKeyboard,
	createKeyDetailsKeyboard,
	createKeyStatsKeyboard
};
