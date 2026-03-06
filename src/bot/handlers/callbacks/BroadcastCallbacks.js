const { Markup } = require('telegraf');
const { ADMIN_IDS } = require('../../../config/constants');
const KeyboardUtils = require('../../../utils/keyboards');
const { BroadcastMessages } = require('../../../services/messages');

/**
 * Обработчик для управления рассылками
 */
class BroadcastCallbacks {
	constructor(database, broadcastService) {
		this.db = database;
		this.broadcastService = broadcastService;
		// Временное хранилище для состояния создания рассылки
		this.broadcastSessions = new Map();
	}

	/**
	 * Главное меню рассылки
	 */
	async handleBroadcastMenu(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.no_access', { ns: 'error' }));
			return;
		}

		const message = BroadcastMessages.mainMenu(t);
		const keyboard = Markup.inlineKeyboard([
			[Markup.button.callback(
				t('buttons.admin.broadcast_new'),
				'broadcast_new'
			)],
			[Markup.button.callback(
				t('buttons.admin.broadcast_history'),
				'broadcast_history'
			)],
			[Markup.button.callback(
				t('buttons.back'),
				'admin_menu'
			)]
		]);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Начать создание новой рассылки - выбор фильтра
	 */
	async handleNewBroadcast(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.no_access', { ns: 'error' }));
			return;
		}

		const message = BroadcastMessages.selectFilter(t);
		const keyboard = Markup.inlineKeyboard([
			[Markup.button.callback(
				t('admin.broadcast.filters.all', { ns: 'message' }),
				'broadcast_filter_all'
			)],
			[Markup.button.callback(
				t('admin.broadcast.filters.active_keys', { ns: 'message' }),
				'broadcast_filter_active_keys'
			)],
			[Markup.button.callback(
				t('admin.broadcast.filters.expired_keys', { ns: 'message' }),
				'broadcast_filter_expired_keys'
			)],
			[Markup.button.callback(
				t('admin.broadcast.filters.no_keys', { ns: 'message' }),
				'broadcast_filter_no_keys'
			)],
			[Markup.button.callback(
				t('admin.broadcast.filters.paid_users', { ns: 'message' }),
				'broadcast_filter_paid_users'
			)],
			[Markup.button.callback(
				t('admin.broadcast.filters.free_users', { ns: 'message' }),
				'broadcast_filter_free_users'
			)],
			[Markup.button.callback(
				t('admin.broadcast.filters.new_users', { ns: 'message' }),
				'broadcast_filter_new_users'
			)],
			[Markup.button.callback(
				t('buttons.back'),
				'admin_broadcast'
			)]
		]);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Обработка выбора фильтра
	 */
	async handleFilterSelection(ctx, filterType) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.no_access', { ns: 'error' }));
			return;
		}

		try {
			// Получаем количество получателей
			const recipients = await this.db.getBroadcastRecipients(filterType);
			const recipientsCount = recipients.length;

			if (recipientsCount === 0) {
				await ctx.answerCbQuery(
					t('admin.broadcast.no_recipients', {
						ns: 'message',
						defaultValue: 'Нет получателей для этого фильтра'
					}),
					{ show_alert: true }
				);
				return;
			}

			// Сохраняем состояние сессии
			const session = {
				filterType,
				recipientsCount,
				step: 'awaiting_message'
			};
			this.broadcastSessions.set(ctx.from.id, session);

			const message = BroadcastMessages.requestMessage(t, filterType, recipientsCount);
			const keyboard = Markup.inlineKeyboard([
				[Markup.button.callback(
					t('buttons.cancel'),
					'broadcast_cancel'
				)]
			]);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});

			await ctx.answerCbQuery();
		} catch (error) {
			console.error('Error selecting filter:', error);
			await ctx.answerCbQuery(
				t('admin.broadcast.error', { ns: 'message' }),
				{ show_alert: true }
			);
		}
	}

	/**
	 * Обработка текстового сообщения (текст рассылки)
	 */
	async handleMessageText(ctx) {
		const t = ctx.i18n.t;
		const session = this.broadcastSessions.get(ctx.from.id);

		if (!session || session.step !== 'awaiting_message') {
			return;
		}

		const messageText = ctx.message.text;

		if (!messageText || messageText.trim().length === 0) {
			await ctx.reply(
				t('admin.broadcast.empty_message', {
					ns: 'message',
					defaultValue: 'Сообщение не может быть пустым'
				})
			);
			return;
		}

		// Сохраняем текст сообщения, переходим к выбору языка
		session.messageText = messageText;
		session.step = 'selecting_language';
		this.broadcastSessions.set(ctx.from.id, session);

		// Показываем выбор языка аудитории
		const filterName = BroadcastMessages.getFilterName(t, session.filterType);
		const message = BroadcastMessages.selectLanguage(t, filterName, session.recipientsCount);

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback(
					t('admin.broadcast.language_ru', { ns: 'message', defaultValue: '🇷🇺 Русский' }),
					'broadcast_lang_ru'
				),
				Markup.button.callback(
					t('admin.broadcast.language_en', { ns: 'message', defaultValue: '🌍 English' }),
					'broadcast_lang_en'
				)
			],
			[Markup.button.callback(
				t('admin.broadcast.language_all', { ns: 'message', defaultValue: '👥 Все языки' }),
				'broadcast_lang_all'
			)],
			[Markup.button.callback(
				t('buttons.cancel'),
				'broadcast_cancel'
			)]
		]);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Обработка выбора языка аудитории
	 */
	async handleLanguageSelection(ctx, lang) {
		const t = ctx.i18n.t;
		const session = this.broadcastSessions.get(ctx.from.id);

		if (!session || session.step !== 'selecting_language') {
			await ctx.answerCbQuery();
			return;
		}

		try {
			// Получаем всех получателей по фильтру и применяем языковой фильтр
			const allRecipients = await this.db.getBroadcastRecipients(session.filterType);
			let filtered = allRecipients;
			if (lang === 'ru') {
				filtered = allRecipients.filter(u => u.language === 'ru');
			} else if (lang === 'en') {
				filtered = allRecipients.filter(u => u.language !== 'ru');
			}

			if (filtered.length === 0) {
				await ctx.answerCbQuery(
					t('admin.broadcast.no_recipients', {
						ns: 'message',
						defaultValue: 'Нет получателей для этого фильтра'
					}),
					{ show_alert: true }
				);
				return;
			}

			session.languageFilter = lang;
			session.recipientsCount = filtered.length;
			session.step = 'confirming';
			this.broadcastSessions.set(ctx.from.id, session);

			const message = BroadcastMessages.confirmBroadcast(
				t,
				session.messageText,
				session.filterType,
				session.recipientsCount,
				null,
				lang
			);

			const keyboard = Markup.inlineKeyboard([
				[
					Markup.button.callback(
						t('buttons.confirm'),
						'broadcast_confirm_send'
					),
					Markup.button.callback(
						t('buttons.admin.broadcast_schedule'),
						'broadcast_schedule'
					)
				],
				[Markup.button.callback(
					t('buttons.cancel'),
					'broadcast_cancel'
				)]
			]);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
			await ctx.answerCbQuery();
		} catch (error) {
			console.error('Error selecting language:', error);
			await ctx.answerCbQuery(
				t('admin.broadcast.error', { ns: 'message' }),
				{ show_alert: true }
			);
		}
	}

	/**
	 * Подтверждение и отправка рассылки
	 */
	async handleConfirmSend(ctx) {
		const t = ctx.i18n.t;
		const session = this.broadcastSessions.get(ctx.from.id);

		if (!session || session.step !== 'confirming') {
			await ctx.answerCbQuery();
			return;
		}

		try {
			// Создаём и запускаем рассылку
			const result = await this.broadcastService.createBroadcast(
				ctx.from.id,
				session.messageText,
				session.filterType,
				session.languageFilter || null
			);

			// Удаляем сессию
			this.broadcastSessions.delete(ctx.from.id);

			const message = BroadcastMessages.broadcastStarted(t, result.broadcastId, false);

			await ctx.editMessageText(message, { parse_mode: 'HTML' });
			await ctx.answerCbQuery(
				t('admin.broadcast.started', { ns: 'message' })
			);
		} catch (error) {
			console.error('Error starting broadcast:', error);
			await ctx.answerCbQuery(
				t('admin.broadcast.error', { ns: 'message' }),
				{ show_alert: true }
			);
		}
	}

	/**
	 * Отмена создания рассылки
	 */
	async handleCancel(ctx) {
		const t = ctx.i18n.t;

		this.broadcastSessions.delete(ctx.from.id);

		const message = BroadcastMessages.broadcastCancelled(t);
		await ctx.editMessageText(message, { parse_mode: 'HTML' });
		await ctx.answerCbQuery();

		// Возвращаемся в меню рассылок
		setTimeout(() => this.handleBroadcastMenu(ctx), 1500);
	}

	/**
	 * История рассылок
	 */
	async handleBroadcastHistory(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.no_access', { ns: 'error' }));
			return;
		}

		try {
			const broadcasts = await this.broadcastService.getBroadcastHistory(10);
			const message = BroadcastMessages.broadcastHistory(t, broadcasts);

			const keyboard = Markup.inlineKeyboard([
				[Markup.button.callback(
					t('buttons.back'),
					'admin_broadcast'
				)]
			]);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Error getting broadcast history:', error);
			await ctx.answerCbQuery(
				t('admin.broadcast.error', { ns: 'message' }),
				{ show_alert: true }
			);
		}
	}
}

module.exports = BroadcastCallbacks;
