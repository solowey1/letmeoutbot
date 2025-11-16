const { MenuMessages } = require('../../../services/messages');
const KeyboardUtils = require('../../../utils/keyboards');

class LanguageCallbacks {
	constructor(database, paymentService, keysService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	async handleChangeLanguage(ctx) {
		const t = ctx.i18n.t;
		const message = t('settings.language_title');

		const keyboard = KeyboardUtils.createLanguageKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleSetLanguage(ctx, lang) {
		await ctx.i18n.setLocale(lang);
		const t = ctx.i18n.t;
		const message = MenuMessages.languageChanged(t);
		const keyboard = KeyboardUtils.createMainMenu(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}
}

module.exports = LanguageCallbacks;
