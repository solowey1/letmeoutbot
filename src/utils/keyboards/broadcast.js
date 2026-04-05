const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createBroadcastAudienceKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'broadcast_all')],
		[btn(t, 'broadcast_active')],
		[
			btn(t, 'broadcast_buyers'),
			btn(t, 'broadcast_non_buyers'),
		],
		[btn(t, 'back', CALLBACK_ACTIONS.ADMIN.MENU)],
	]);
}

function createBroadcastMenuKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'broadcast_new')],
		[btn(t, 'broadcast_history')],
		[btn(t, 'back', CALLBACK_ACTIONS.ADMIN.MENU)]
	]);
}

function createBroadcastFilterKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'broadcast_filter_all')],
		[btn(t, 'broadcast_filter_active_keys')],
		[btn(t, 'broadcast_filter_expired_keys')],
		[btn(t, 'broadcast_filter_no_keys')],
		[btn(t, 'broadcast_filter_paid_users')],
		[btn(t, 'broadcast_filter_free_users')],
		[btn(t, 'broadcast_filter_new_users')],
		[btn(t, 'back', 'admin_broadcast')]
	]);
}

function createBroadcastCancelKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'cancel', 'broadcast_cancel')]
	]);
}

function createBroadcastLanguageKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'broadcast_lang_ru'),
			btn(t, 'broadcast_lang_en')
		],
		[btn(t, 'broadcast_lang_all')],
		[btn(t, 'cancel', 'broadcast_cancel')]
	]);
}

function createBroadcastConfirmKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'broadcast_confirm_send'),
			btn(t, 'broadcast_schedule')
		],
		[btn(t, 'cancel', 'broadcast_cancel')]
	]);
}

function createBroadcastHistoryKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'back', 'admin_broadcast')]
	]);
}

module.exports = {
	createBroadcastAudienceKeyboard,
	createBroadcastMenuKeyboard,
	createBroadcastFilterKeyboard,
	createBroadcastCancelKeyboard,
	createBroadcastLanguageKeyboard,
	createBroadcastConfirmKeyboard,
	createBroadcastHistoryKeyboard
};
