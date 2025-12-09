const { MenuMessages } = require('../../../services/messages');
const KeyboardUtils = require('../../../utils/keyboards');
const { ADMIN_IDS } = require('../../../config/constants');

class LanguageCallbacks {
	constructor(database, paymentService, keysService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	async handleChangeLanguage(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.languageChanging(t);

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
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const keyboard = KeyboardUtils.createMainMenu(t, isAdmin);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}
}

module.exports = LanguageCallbacks;
