const KeyboardUtils = require('../../utils/keyboards');

class LanguageCallbacks {
	constructor(database, paymentService, subscriptionService) {
		this.db = database;
		this.paymentService = paymentService;
		this.subscriptionService = subscriptionService;
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
		const t = ctx.i18n.t; // Обновляем функцию перевода

		await ctx.editMessageText(t('settings.language_changed'), {
			...KeyboardUtils.createMainMenu(t),
			parse_mode: 'HTML'
		});
	}
}

module.exports = LanguageCallbacks;
