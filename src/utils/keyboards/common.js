const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const { BUTTON_PRESETS } = require('../../config/buttonPresets');

/**
 * Создать кнопку по пресету.
 *
 * Поддерживает те же методы, что и Telegraf Button:
 *   callback (по умолчанию), url, switchToChat
 *
 * @param {Function} t      — функция перевода
 * @param {string}   preset — имя пресета из BUTTON_PRESETS
 * @param {string|null} override — переопределить action/url/value из пресета
 */
function btn(t, preset, override = null) {
	const config = BUTTON_PRESETS[preset] || {};
	const text = config.text ? t(config.text, config.params || {}) : preset;
	const method = config.method || 'callback';

	let button;

	switch (method) {
		case 'url':
			button = Markup.button.url(text, override || config.url);
			break;
		case 'switchToChat':
			button = Markup.button.switchToChat(text, override || config.value || '');
			break;
		default:
			button = Markup.button.callback(text, override || config.action);
			break;
	}

	if (config.style) button.style = config.style;
	if (config.icon) button.icon_custom_emoji_id = config.icon;
	return button;
}

function removeKeyboard() {
	return Markup.removeKeyboard();
}

function createBackToMenuKeyboard(t) {
	return Markup.inlineKeyboard([
		[btn(t, 'home')]
	]);
}

function createErrorKeyboard(t, backAction = CALLBACK_ACTIONS.BASIC.HOME) {
	return Markup.inlineKeyboard([
		[btn(t, 'retry')],
		[btn(t, 'back', backAction)]
	]);
}

function createPaginatedKeyboard(t, items, currentPage, itemsPerPage, callbackPrefix, backAction) {
	const buttons = [];
	const startIndex = currentPage * itemsPerPage;
	const endIndex = Math.min(startIndex + itemsPerPage, items.length);

	for (let i = startIndex; i < endIndex; i++) {
		const item = items[i];
		buttons.push([Markup.button.callback(item.name, `${callbackPrefix}_${item.id}`)]);
	}

	const navButtons = [];
	if (currentPage > 0) {
		navButtons.push(btn(t, 'page_prev', `page_${callbackPrefix}_${currentPage - 1}`));
	}

	navButtons.push(Markup.button.callback(
		`${currentPage + 1}/${Math.ceil(items.length / itemsPerPage)}`,
		'current_page'
	));

	if (endIndex < items.length) {
		navButtons.push(btn(t, 'page_next', `page_${callbackPrefix}_${currentPage + 1}`));
	}

	if (navButtons.length > 1) {
		buttons.push(navButtons);
	}

	buttons.push([btn(t, 'back', backAction)]);

	return Markup.inlineKeyboard(buttons);
}

module.exports = {
	btn,
	removeKeyboard,
	createBackToMenuKeyboard,
	createErrorKeyboard,
	createPaginatedKeyboard
};
