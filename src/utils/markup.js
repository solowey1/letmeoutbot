/**
 * Локальная замена telegraf Markup после переезда на grammY.
 *
 * Кнопки — простые объекты Bot API (InlineKeyboardButton), поэтому к ним
 * можно дописывать нестандартные поля (style, icon_custom_emoji_id),
 * grammY передаёт их в Telegram как есть.
 *
 * inlineKeyboard()/removeKeyboard() возвращают { reply_markup },
 * чтобы работал существующий паттерн `{ ...keyboard, parse_mode: 'HTML' }`.
 */
const Markup = {
	button: {
		callback: (text, callback_data) => ({ text, callback_data }),
		url: (text, url) => ({ text, url }),
		switchToChat: (text, query = '') => ({ text, switch_inline_query: query })
	},
	inlineKeyboard: (inline_keyboard) => ({ reply_markup: { inline_keyboard } }),
	removeKeyboard: () => ({ reply_markup: { remove_keyboard: true } })
};

module.exports = { Markup };
