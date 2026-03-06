const KeyboardUtils = require('../../utils/keyboards');
const { MenuMessages } = require('../../services/messages');
const { ADMIN_IDS } = require('../../config/constants');
const pendingBroadcast = require('../../utils/broadcastState');

class MessageHandlers {
	constructor(database, bot, broadcastCallbacks = null) {
		this.db = database;
		this.bot = bot;
		this.broadcastCallbacks = broadcastCallbacks;
	}

	async handleMessage(ctx) {
		const userId = ctx.from.id;

		// Обработка сообщения для новой системы рассылок (BroadcastCallbacks)
		if (this.broadcastCallbacks && ADMIN_IDS.includes(userId)) {
			const session = this.broadcastCallbacks.broadcastSessions.get(userId);
			if (session && session.step === 'awaiting_message') {
				await this.broadcastCallbacks.handleMessageText(ctx);
				return;
			}
		}

		// Обработка сообщения для рассылки (любой тип контента)
		if (ADMIN_IDS.includes(userId) && pendingBroadcast.has(userId)) {
			const state = pendingBroadcast.get(userId);
			pendingBroadcast.delete(userId);

			// /cancel — только для текстовых сообщений
			if (ctx.message.text && (ctx.message.text === '/cancel' || ctx.message.text.startsWith('/cancel'))) {
				const t = ctx.i18n.t;
				await ctx.reply(t('admin.broadcast.cancelled', { ns: 'message' }));
				return;
			}

			await this.executeBroadcast(ctx, state.audience);
			return;
		}

		if (!ctx.message.text) return;

		await this.showMainMenu(ctx);
	}

	async _getUsersForAudience(audience) {
		switch (audience) {
		case 'active':
			return this.db.getUsersWithActiveKeys();
		case 'buyers':
			return this.db.getBuyerUsers();
		case 'non_buyers':
			return this.db.getNonBuyerUsers();
		default:
			return this.db.getAllUsers(10000);
		}
	}

	async executeBroadcast(ctx, audience) {
		const t = ctx.i18n.t;

		let users;
		try {
			users = await this._getUsersForAudience(audience);
		} catch (error) {
			console.error('Broadcast: ошибка получения пользователей:', error);
			await ctx.reply(t('admin.loading_error', { ns: 'message' }));
			return;
		}

		if (!users || users.length === 0) {
			await ctx.reply(t('admin.broadcast.no_users', { ns: 'message' }));
			return;
		}

		const statusMsg = await ctx.reply(t('admin.broadcast.sending', { ns: 'message' }));

		const fromChatId = ctx.chat.id;
		const messageId = ctx.message.message_id;

		let sent = 0;
		let errors = 0;

		for (const user of users) {
			try {
				await this.bot.telegram.copyMessage(user.telegram_id, fromChatId, messageId);
				sent++;
			} catch {
				errors++;
			}
			// Задержка чтобы не упереться в rate limit Telegram (30 msg/s max)
			await new Promise(resolve => setTimeout(resolve, 35));
		}

		const result = t('admin.broadcast.done', { ns: 'message', sent, errors });
		try {
			await this.bot.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, result, { parse_mode: 'HTML' });
		} catch {
			await ctx.reply(result, { parse_mode: 'HTML' });
		}
	}

	async showMainMenu(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.welcome(t);
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const keyboard = KeyboardUtils.createMainMenu(t, isAdmin);

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
