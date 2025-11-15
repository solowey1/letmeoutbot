const KeyboardUtils = require('../../utils/keyboards');
const { MenuMessages } = require('../../services/messages');

class MessageHandlers {
	constructor(database) {
		this.db = database;
	}

	async handleMessage(ctx) {
		// Показываем главное меню при любом текстовом сообщении
		if (ctx.message.text) {
			await this.showMainMenu(ctx);
		}
	}

	async showMainMenu(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.welcome(t);
		const keyboard = KeyboardUtils.createMainMenu(t);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	// Регистрация обработчиков сообщений в боте
	register(bot) {
		bot.on('message', async (ctx) => {
			try {
				await this.handleMessage(ctx);
			} catch (error) {
				console.error('Ошибка обработки сообщения:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('errors.generic'));
			}
		});
	}
}

module.exports = MessageHandlers;
