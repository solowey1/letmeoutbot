const { MESSAGES } = require('../../config/constants');
const KeyboardUtils = require('../../utils/keyboards');

class MenuCallbacks {
	constructor(database, paymentService, subscriptionService) {
		this.db = database;
		this.paymentService = paymentService;
		this.subscriptionService = subscriptionService;
	}

	async handleBackToMenu(ctx) {
		const keyboard = KeyboardUtils.createMainMenu();
		await ctx.editMessageText(MESSAGES.WELCOME, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleSettings(ctx) {
		const t = ctx.i18n.t;
		const message = t('settings.title');

		const keyboard = KeyboardUtils.createSettingsKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleHelp(ctx) {
		const keyboard = KeyboardUtils.createHelpKeyboard();
		await ctx.editMessageText(MESSAGES.HELP, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleDownloadApps(ctx) {
		const keyboard = KeyboardUtils.createAppsDownloadKeyboard();
		const message = '📱 <b>Скачать Outline Client:</b>\n\n' +
			'Выберите приложение для вашей операционной системы:\n\n' +
			'🔸 <b>Android</b> - Google Play Store\n' +
			'🔸 <b>iOS</b> - App Store\n' +
			'🔸 <b>Windows</b> - Прямая ссылка\n' +
			'🔸 <b>macOS</b> - Прямая ссылка\n\n' +
			'После установки добавьте ваш ключ доступа в приложение.';

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleSupport(ctx) {
		const message = '🆘 <b>Поддержка</b>\n\n' +
			'Если у вас возникли проблемы:\n\n' +
			'1. Проверьте правильность ключа доступа\n' +
			'2. Убедитесь, что приложение Outline обновлено\n' +
			'3. Попробуйте переподключиться\n' +
			'4. Проверьте наличие трафика у ключа\n\n' +
			'📧 Для технической поддержки обратитесь к администратору.';

		const keyboard = KeyboardUtils.createBackToMenuKeyboard();

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}
}

module.exports = MenuCallbacks;
