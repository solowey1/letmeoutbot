const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createReferralMenuKeyboard(t, shareText, tonWallet = null) {
	const walletLabel = tonWallet
		? `${tonWallet.slice(0, 6)}…${tonWallet.slice(-4)}`
		: t('buttons.ton_wallet_connect');
	const walletBtn = Markup.button.callback(walletLabel, CALLBACK_ACTIONS.REFERRAL.SET_WALLET);
	walletBtn.icon_custom_emoji_id = '5769406891289481208';
	return Markup.inlineKeyboard([
		[btn(t, 'ref_get_link')],
		[
			btn(t, 'ref_my_referrals'),
			btn(t, 'ref_invite_share', shareText),
		],
		[
			btn(t, 'ref_withdraw'),
			btn(t, 'ref_history'),
		],
		[walletBtn],
		[btn(t, 'home')]
	]);
}

function createReferralInviteKeyboard(t, shareText) {
	return Markup.inlineKeyboard([
		[btn(t, 'ref_invite_share', shareText)],
		[btn(t, 'back', CALLBACK_ACTIONS.REFERRAL.MENU)]
	]);
}

function createReferralBackKeyboard(t) {
	return Markup.inlineKeyboard([
		[
			btn(t, 'back', CALLBACK_ACTIONS.REFERRAL.MENU),
			btn(t, 'home')
		]
	]);
}

function createWithdrawalConfirmKeyboard(t, amount) {
	const buttonWithdraw = Markup.button.callback(
		`${amount} — ${t('buttons.referral_actions.withdraw_confirm')}`,
		CALLBACK_ACTIONS.REFERRAL.CONFIRM_WITHDRAW
	);
	buttonWithdraw.icon_custom_emoji_id = '5848259999763011021';
	return Markup.inlineKeyboard([
		[buttonWithdraw],
		[btn(t, 'cancel', CALLBACK_ACTIONS.REFERRAL.MENU)]
	]);
}

module.exports = {
	createReferralMenuKeyboard,
	createReferralInviteKeyboard,
	createReferralBackKeyboard,
	createWithdrawalConfirmKeyboard
};
