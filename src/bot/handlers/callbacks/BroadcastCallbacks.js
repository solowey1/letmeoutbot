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
				t('buttons.admin.broadcast_new', { defaultValue: '📤 Новая рассылка' }),
				'broadcast_new'
			)],
			[Markup.button.callback(
				t('buttons.admin.broadcast_history', { defaultValue: '📜 История' }),
				'broadcast_history'
			)],
			[Markup.button.callback(
				t('buttons.back', { ns: 'button' }),
				'admin_panel'
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
				t('buttons.back', { ns: 'button' }),
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
					t('buttons.cancel', { ns: 'button', defaultValue: '❌ Отмена' }),
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

		// Сохраняем текст сообщения
		session.messageText = messageText;
		session.step = 'confirming';
		this.broadcastSessions.set(ctx.from.id, session);

		// Показываем подтверждение
		const message = BroadcastMessages.confirmBroadcast(
			t,
			messageText,
			session.filterType,
			session.recipientsCount
		);

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback(
					t('buttons.confirm', { ns: 'button', defaultValue: '✅ Отправить' }),
					'broadcast_confirm_send'
				),
				Markup.button.callback(
					t('buttons.admin.broadcast_schedule', { defaultValue: '⏰ Отложить' }),
					'broadcast_schedule'
				)
			],
			[Markup.button.callback(
				t('buttons.cancel', { ns: 'button', defaultValue: '❌ Отмена' }),
				'broadcast_cancel'
			)]
		]);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
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
				session.filterType
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
					t('buttons.back', { ns: 'button' }),
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
