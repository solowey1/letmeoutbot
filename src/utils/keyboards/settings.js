const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createSettingsKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'language')],
		[btn(t, 'settings_ton')],
		[btn(t, 'home')]
	]);
}

function createTonWalletKeyboard(t, walletConnected) {
	const inputBtn = Markup.button.callback(
		walletConnected ? t('buttons.ton_wallet_change') : t('buttons.ton_wallet_connect'),
		CALLBACK_ACTIONS.SETTINGS.TON_WALLET_INPUT
	);
	inputBtn.icon_custom_emoji_id = '5769406891289481208';

	return Markup.inlineKeyboard([
		[inputBtn],
		[btn(t, 'back', CALLBACK_ACTIONS.SETTINGS.MENU)]
	]);
}

function createLanguageKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'lang_ru')],
		[btn(t, 'lang_en')],
		[
			btn(t, 'back', CALLBACK_ACTIONS.SETTINGS.MENU),
			btn(t, 'home')
		]
	]);
}

module.exports = {
	createSettingsKeyboard,
	createLanguageKeyboard,
	createTonWalletKeyboard,
};
