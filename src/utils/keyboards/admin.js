const { Markup } = require('../markup');
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

function createWithdrawalManualConfirmKeyboard(t, withdrawalId) {
	return Markup.inlineKeyboard([
		[
			Markup.button.callback(t('buttons.admin.withdrawal_manual_paid'), `${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.MANUAL_PAID}_${withdrawalId}`),
			Markup.button.callback(t('buttons.admin.withdrawal_manual_unpaid'), `${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.MANUAL_UNPAID}_${withdrawalId}`),
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

// ══════════════════════════════════════════════
// Настройки: продажи и тарифы
// ══════════════════════════════════════════════

const A = CALLBACK_ACTIONS.ADMIN;

function createAdminSettingsKeyboard(t, { vpnSales, proxySales }) {
	const flag = (on) => (on ? '🟢' : '🔴');
	const state = (on) => t(on ? 'buttons.admin.sales_on' : 'buttons.admin.sales_off');

	return Markup.inlineKeyboard([
		[Markup.button.callback(
			`${flag(vpnSales)} ${t('buttons.admin.sales_vpn')}: ${state(vpnSales)}`,
			A.SALES.TOGGLE_VPN
		)],
		[Markup.button.callback(
			`${flag(proxySales)} ${t('buttons.admin.sales_proxy')}: ${state(proxySales)}`,
			A.SALES.TOGGLE_PROXY
		)],
		[Markup.button.callback(t('buttons.admin.plans_vpn'), `${A.PLANS.LIST}_vless`)],
		[Markup.button.callback(t('buttons.admin.plans_proxy'), `${A.PLANS.LIST}_mtproto`)],
		[Markup.button.callback(t('buttons.admin.px6_settings'), A.PX6.MENU)],
		[btn(t, 'back', A.MENU)]
	]);
}

function createAdminPlanListKeyboard(t, plans) {
	const rows = plans.map(plan => [
		Markup.button.callback(
			`${plan.disabled ? '🔴' : '🟢'} ${plan.name} — ${plan.price} ⭐`,
			`${A.PLANS.VIEW}_${plan.id}`
		)
	]);
	rows.push([btn(t, 'back', A.SETTINGS)]);
	return Markup.inlineKeyboard(rows);
}

function createAdminPlanKeyboard(t, plan) {
	const rows = [
		[Markup.button.callback(t('buttons.admin.edit_price'), `${A.PLANS.EDIT_PRICE}_${plan.id}`)]
	];

	// У прокси нет объёма трафика — лимит редактировать нечего
	if (plan.type !== 'mtproto') {
		rows.push([Markup.button.callback(t('buttons.admin.edit_limit'), `${A.PLANS.EDIT_LIMIT}_${plan.id}`)]);
	}

	rows.push([Markup.button.callback(
		plan.disabled ? t('buttons.admin.plan_enable') : t('buttons.admin.plan_disable'),
		`${A.PLANS.TOGGLE}_${plan.id}`
	)]);
	rows.push([btn(t, 'back', `${A.PLANS.LIST}_${plan.type}`)]);

	return Markup.inlineKeyboard(rows);
}

function createAdminPx6Keyboard(t, { enabled }) {
	return Markup.inlineKeyboard([
		[Markup.button.callback(
			`${enabled ? '🟢' : '🔴'} ${t('buttons.admin.sales_px6')}: ${t(enabled ? 'buttons.admin.sales_on' : 'buttons.admin.sales_off')}`,
			A.SALES.TOGGLE_PX6
		)],
		[Markup.button.callback(t('buttons.admin.px6_markup'), A.PX6.EDIT_MARKUP)],
		[Markup.button.callback(t('buttons.admin.px6_rate'), A.PX6.EDIT_RATE)],
		[btn(t, 'back', A.SETTINGS)]
	]);
}

function createAdminPx6CancelKeyboard(t) {
	return Markup.inlineKeyboard([
		[Markup.button.callback(t('buttons.cancel'), A.PX6.MENU)]
	]);
}

function createAdminPlanCancelKeyboard(t, planId) {
	return Markup.inlineKeyboard([
		[Markup.button.callback(t('buttons.cancel'), `${A.PLANS.VIEW}_${planId}`)]
	]);
}

module.exports = {
	createAdminKeyboard,
	createWithdrawalAdminKeyboard,
	createWithdrawalManualConfirmKeyboard,
	createWithdrawalListKeyboard,
	createAdminSettingsKeyboard,
	createAdminPlanListKeyboard,
	createAdminPlanKeyboard,
	createAdminPlanCancelKeyboard,
	createAdminPx6Keyboard,
	createAdminPx6CancelKeyboard,
};
