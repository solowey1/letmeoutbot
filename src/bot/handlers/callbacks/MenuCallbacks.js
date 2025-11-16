const KeyboardUtils = require('../../../utils/keyboards');
const { MenuMessages } = require('../../../services/messages');

class MenuCallbacks {
	constructor(database, paymentService, keysService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	async handleBackToMenu(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.welcome(t);
		const keyboard = KeyboardUtils.createMainMenu(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleSettings(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.settings(t);
		const keyboard = KeyboardUtils.createSettingsKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleHelp(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.help(t);
		const keyboard = KeyboardUtils.createHelpKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	async handleDownloadApps(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.downloadApps(t);
		const keyboard = KeyboardUtils.createAppsDownloadKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	async handleSupport(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.support(t);
		const keyboard = KeyboardUtils.createBackToMenuKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}
}

module.exports = MenuCallbacks;
