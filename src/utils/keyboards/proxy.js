const { Markup } = require('../markup');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const PlanService = require('../../services/PlanService');
const Px6PricingService = require('../../services/Px6PricingService');
const { btn } = require('./common');

const V = require('../../services/Px6Service').VERSION;

/**
 * Выбор типа прокси. Наш MTProto и перепродажа px6 включаются отдельно,
 * поэтому недоступный продукт просто не показываем.
 */
function createProxyMenuKeyboard(t, { ownEnabled = true, px6Enabled = true } = {}) {
	const rows = [];

	// Наш прокси первым — он свой, дешевле и без похода во внешний API
	if (ownEnabled) {
		rows.push([Markup.button.callback(t('buttons.proxy.mtproto_own'), CALLBACK_ACTIONS.PROXY.MTPROTO)]);
	}

	if (px6Enabled) {
		for (const version of [V.MTPROTO, V.IPV6, V.IPV4, V.IPV4_SHARED]) {
			rows.push([Markup.button.callback(
				version === V.MTPROTO ? t('buttons.proxy.mtproto_ext') : Px6PricingService.versionLabel(version),
				`${CALLBACK_ACTIONS.PX6.COUNTRY}_${version}`
			)]);
		}
	}

	rows.push([btn(t, 'home')]);
	return Markup.inlineKeyboard(rows);
}

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

	buttons.push([
		btn(t, 'back', CALLBACK_ACTIONS.PROXY.MENU),
		btn(t, 'home')
	]);

	return Markup.inlineKeyboard(buttons);
}

function createProxyConnectKeyboard(t, tgLink) {
	return Markup.inlineKeyboard([
		[btn(t, 'connect_proxy', tgLink)],
		[btn(t, 'my_keys')]
	]);
}

module.exports = {
	createProxyMenuKeyboard,
	createProxyPlansKeyboard,
	createProxyConnectKeyboard
};
