const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { btn } = require('./common');

function createSettingsKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'language')],
		[btn(t, 'home')]
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
	createLanguageKeyboard
};
