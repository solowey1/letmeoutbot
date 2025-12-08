const KeyboardUtils = require('../../utils/keyboards');
const { MenuMessages } = require('../../services/messages');

class MessageHandlers {
	constructor(database, broadcastCallbacks = null) {
		this.db = database;
		this.broadcastCallbacks = broadcastCallbacks;
	}

	async handleMessage(ctx) {
		// Проверяем, не ждём ли мы текст сообщения для рассылки
		if (this.broadcastCallbacks && ctx.message.text) {
			const handled = await this.broadcastCallbacks.handleMessageText(ctx);
			if (handled !== false) {
				return;
			}
		}

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
				await ctx.reply(t('generic.default', { ns: 'error' }));
			}
		});
	}
}

module.exports = MessageHandlers;
