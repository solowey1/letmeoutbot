require('dotenv').config();
const { Telegraf } = require('telegraf');
const { ADMIN_IDS } = require('../../config/constants');

// Импорты для БД
const SQLiteDatabase = require('../../models/Database');
const PostgresDatabase = require('../../models/PostgresDatabase');
const SupabaseDatabase = require('../../models/SupabaseDatabase');
const config = require('../../config');

// Простой хелпер для переводов (SupportBot не использует i18n middleware)
const ruMessages = require('../../locales/ru/message.json');
const supportStrings = ruMessages.support.bot;

class SupportBot {
	constructor() {
		// Инициализируем Telegraf бота с токеном support бота
		const supportToken = process.env.SUPPORT_BOT_TOKEN;
		if (!supportToken) {
			throw new Error('SUPPORT_BOT_TOKEN не найден в переменных окружения');
		}

		this.bot = new Telegraf(supportToken, config.telegram.options);

		// Используем ту же базу данных, что и основной бот
		if (config.database.type === 'supabase') {
			console.log('☁️  Support Bot: Используется Supabase');
			this.db = new SupabaseDatabase(
				config.database.supabase.url,
				config.database.supabase.apiKey
			);
		} else if (config.database.type === 'postgres') {
			console.log('🐘 Support Bot: Используется PostgreSQL Direct');
			this.db = new PostgresDatabase(config.database.url);
		} else {
			console.log('📁 Support Bot: Используется SQLite');
			this.db = new SQLiteDatabase(config.database.path);
		}

		// Состояние: кому сейчас админ отвечает
		// Формат: { [adminId]: { userId: telegram_id, messageId: support_message_id } }
		this.adminReplyState = new Map();

		this.setupHandlers();
	}

	setupHandlers() {
		// Команда /start
		this.bot.start(async (ctx) => {
			const isAdmin = ADMIN_IDS.includes(ctx.from.id);

			if (isAdmin) {
				await ctx.reply(`👨‍💼 ${supportStrings.admin_welcome}`);
			} else {
				await ctx.reply(`👋 ${supportStrings.user_welcome}`);
			}
		});

		// Обработка callback'ов (кнопка "Ответить")
		this.bot.on('callback_query', async (ctx) => {
			const callbackData = ctx.callbackQuery.data;

			if (callbackData.startsWith('reply_')) {
				await this.handleReplyButton(ctx, callbackData);
			}

			await ctx.answerCbQuery();
		});

		// Обработка текстовых сообщений
		this.bot.on('text', async (ctx) => {
			const adminId = ctx.from.id;
			const isAdmin = ADMIN_IDS.includes(adminId);

			if (isAdmin) {
				// Админ отправляет ответ
				await this.handleAdminReply(ctx);
			} else {
				// Пользователь задает вопрос
				await this.handleUserMessage(ctx);
			}
		});

		// Обработка ошибок
		this.bot.catch((err) => {
			console.error('Ошибка Support Bot:', err);
		});
	}

	async handleUserMessage(ctx) {
		const userId = ctx.from.id;
		const firstName = ctx.from.first_name || supportStrings.default_name;
		const username = ctx.from.username;
		const messageText = ctx.message.text;

		try {
			// Сохраняем сообщение в БД
			const messageId = await this.db.createSupportMessage({
				user_telegram_id: userId,
				user_first_name: firstName,
				user_username: username,
				message_text: messageText,
				message_type: 'user_question'
			});

			// Подтверждаем пользователю
			await ctx.reply(`✅ ${supportStrings.message_received}`);

			// Отправляем уведомление всем админам
			await this.notifyAdmins(userId, firstName, username, messageText, messageId);

		} catch (error) {
			console.error('Ошибка обработки сообщения пользователя:', error);
			await ctx.reply(`❌ ${supportStrings.error_generic}`);
		}
	}

	async notifyAdmins(userId, firstName, username, messageText, messageId) {
		const userInfo = username ? `${firstName} (@${username})` : firstName;
		const message =
			`📩 <b>${supportStrings.new_message_title}</b>\n\n` +
			`${supportStrings.from_label}: <b>${userInfo}</b>\n` +
			`ID: <code>${userId}</code>\n\n` +
			`<i>${messageText}</i>`;

		const keyboard = {
			inline_keyboard: [
				[{ text: `💬 ${supportStrings.reply_button}`, callback_data: `reply_${userId}_${messageId}` }]
			]
		};

		// Отправляем уведомление всем админам
		for (const adminId of ADMIN_IDS) {
			try {
				await this.bot.telegram.sendMessage(adminId, message, {
					parse_mode: 'HTML',
					reply_markup: keyboard
				});
			} catch (error) {
				console.error(`Не удалось отправить уведомление админу ${adminId}:`, error.message);
			}
		}
	}

	async handleReplyButton(ctx, callbackData) {
		// Формат: reply_{userId}_{messageId}
		const parts = callbackData.split('_');
		const userId = parseInt(parts[1]);
		const messageId = parseInt(parts[2]);
		const adminId = ctx.from.id;

		// Сохраняем состояние: этот админ сейчас отвечает этому пользователю
		this.adminReplyState.set(adminId, { userId, messageId });

		await this.db.setAdminReplyState(adminId, userId, messageId);

		await ctx.reply(`✍️ ${supportStrings.write_reply}`);
	}

	async handleAdminReply(ctx) {
		const adminId = ctx.from.id;
		const replyState = this.adminReplyState.get(adminId);

		if (!replyState) {
			// Админ не в режиме ответа, проверяем в БД
			const dbState = await this.db.getAdminReplyState(adminId);

			if (!dbState) {
				await ctx.reply(`ℹ️ ${supportStrings.not_in_reply_mode}`);
				return;
			}

			// Восстанавливаем состояние из БД
			this.adminReplyState.set(adminId, {
				userId: dbState.replying_to_user_id,
				messageId: dbState.replying_to_message_id
			});
		}

		const { userId, messageId } = this.adminReplyState.get(adminId);
		const replyText = ctx.message.text;

		try {
			// Отправляем ответ пользователю
			await this.bot.telegram.sendMessage(
				userId,
				`💬 <b>${supportStrings.reply_from_support}</b>\n\n${replyText}`,
				{ parse_mode: 'HTML' }
			);

			// Сохраняем ответ в БД
			await this.db.createSupportMessage({
				user_telegram_id: userId,
				user_first_name: null,
				user_username: null,
				message_text: replyText,
				message_type: 'admin_reply'
			});

			// Обновляем статус исходного сообщения
			await this.db.markSupportMessageReplied(messageId, adminId);

			// Подтверждаем админу
			await ctx.reply(`✅ ${supportStrings.reply_sent}`);

			// Очищаем состояние
			this.adminReplyState.delete(adminId);
			await this.db.clearAdminReplyState(adminId);

		} catch (error) {
			console.error('Ошибка отправки ответа:', error);
			await ctx.reply(`❌ ${supportStrings.reply_failed}`);
		}
	}

	async start() {
		try {
			console.log('🤖 Support Bot запускается...');
			await this.bot.launch();
			console.log('✅ Support Bot успешно запущен!');

			// Graceful stop
			process.once('SIGINT', () => {
				console.log('Получен SIGINT, завершаю работу Support Bot...');
				this.stop();
			});

			process.once('SIGTERM', () => {
				console.log('Получен SIGTERM, завершаю работу Support Bot...');
				this.stop();
			});

		} catch (error) {
			console.error('❌ Ошибка запуска Support Bot:', error);
			process.exit(1);
		}
	}

	stop() {
		console.log('🛑 Остановка Support Bot...');
		this.bot.stop('SIGINT');
		console.log('✅ Support Bot успешно остановлен');
	}
}

module.exports = SupportBot;
