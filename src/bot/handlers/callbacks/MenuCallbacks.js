const KeyboardUtils = require('../../../utils/keyboards');
const { MenuMessages } = require('../../../services/messages');
const { ADMIN_IDS } = require('../../../config/constants');

class MenuCallbacks {
	constructor(database, paymentService, keysService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	async handleBackToMenu(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.welcome(t);
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const keyboard = KeyboardUtils.createMainMenu(t, isAdmin);

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

	async handleHowToAddKey(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.howToAddKey(t);
		const keyboard = KeyboardUtils.createHowToAddKeyKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleHowToAddKeyProtocol(ctx, protocol) {
		const t = ctx.i18n.t;
		const message = MenuMessages.howToAddKeyProtocol(t, protocol);
		const keyboard = KeyboardUtils.createHowToAddKeyBackKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleVpnApps(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.vpnApps(t);
		const keyboard = KeyboardUtils.createVpnAppsProtocolKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleOutlineApps(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.outlineApps(t);
		const keyboard = KeyboardUtils.createOutlineAppsKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	async handleVlessChooseOs(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.vlessChooseOs(t);
		const keyboard = KeyboardUtils.createVlessOsKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleVlessApps(ctx, os) {
		const t = ctx.i18n.t;
		const message = MenuMessages.vlessApps(t, os);
		const keyboard = KeyboardUtils.createVlessAppsBackKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	async handleSupport(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.support(t);
		const keyboard = KeyboardUtils.createSupportKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}
}

module.exports = MenuCallbacks;
