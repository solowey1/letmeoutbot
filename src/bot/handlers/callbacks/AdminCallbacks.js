const { ADMIN_IDS, CALLBACK_ACTIONS } = require('../../../config/constants');
const { Markup } = require('telegraf');
const KeyboardUtils = require('../../../utils/keyboards');
const { btn } = require('../../../utils/keyboards/common');
const { AdminMessages } = require('../../../services/messages');
const pendingBroadcast = require('../../../utils/broadcastState');

class AdminCallbacks {
	constructor(database, paymentService, keysService, broadcastCallbacks = null) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.broadcastCallbacks = broadcastCallbacks;
	}

	async handleAdminPanel(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		const keyboard = KeyboardUtils.createAdminKeyboard(t);
		const message = AdminMessages.adminPanel(t);

		try {
			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			// Игнорируем ошибку "message is not modified"
			if (error.description && error.description.includes('message is not modified')) {
				console.log('Админ-панель: сообщение не изменилось');
			} else {
				console.error('Ошибка редактирования сообщения админ-панели:', error);
			}
		}
	}

	async handleAdminUsers(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const users = await this.db.getAllUsers(10);
			const message = AdminMessages.usersList(t, users);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				// Игнорируем ошибку "message is not modified" от Telegram
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Сообщение не изменилось, пропускаем обновление');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения пользователей:', error);
			console.error('Детали ошибки:', error.message, error.stack);

			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				// Если не можем отредактировать сообщение, просто логируем
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminStats(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const stats = await this.db.getStats();

			// Normalize stats object (SupabaseDatabase returns snake_case, others return camelCase)
			const normalizedStats = {
				totalUsers: stats.totalUsers || stats.total_users || 0,
				activeKeys: stats.activeKeys || stats.active_keys || 0,
				totalRevenue: stats.totalRevenue || stats.total_revenue || 0,
				successfulPayments: stats.totalPayments || stats.total_payments || 0
			};

			const message = AdminMessages.stats(t, normalizedStats);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Статистика: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения статистики:', error);
			console.error('Детали ошибки:', error.message);

			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminPayments(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const payments = await this.db.getRecentPayments(20);
			const message = AdminMessages.paymentsList(t, payments);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Платежи: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения платежей:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminKeys(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const keys = await this.db.getAllActiveKeys();
			const message = AdminMessages.keysList(t, keys);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Ключи: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения ключей:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminPendingKeys(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const pendingKeys = await this.db.getPendingKeys(20);
			const message = await AdminMessages.pendingKeysList(t, pendingKeys, (userId) => this.db.getUserById(userId));

			// Кнопки для повторной активации каждого pending ключа
			const buttons = pendingKeys.map(key =>
				[{
					...Markup.button.callback(
						t('admin.pending_keys.activate_btn', { ns: 'message', id: key.id }),
						`${CALLBACK_ACTIONS.ADMIN.KEYS.RETRY_ACTIVATE}_${key.id}`
					),
					icon_custom_emoji_id: '5850346984501680054'
				}]
			);
			buttons.push([btn(t, 'back', CALLBACK_ACTIONS.ADMIN.MENU)]);
			const keyboard = Markup.inlineKeyboard(buttons);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Pending ключи: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения pending ключей:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleRetryActivateKey(ctx, keyId) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			await ctx.answerCbQuery(t('admin.pending_keys.activating', { ns: 'message' }));
			const result = await this.keysService.retryActivateKey(keyId);

			// Уведомляем пользователя через Telegram на его языке
			if (result.key) {
				try {
					const user = await this.db.getUserById(result.key.user_id);
					if (user) {
						const savedLocale = ctx.i18n.locale;
						ctx.i18n.locale = user.language || 'ru';
						const ut = ctx.i18n.t;

						let msg = `<b>${ut('admin.pending_keys.activated_title', { ns: 'message' })}</b>\n\n`;
						if (result.vlessUrl) {
							msg += `<b>${ut('admin.pending_keys.vless_label', { ns: 'message' })}</b>\n<code>${result.vlessUrl}</code>\n\n`;
						}
						if (result.accessUrl && result.accessUrl !== result.vlessUrl) {
							msg += `<b>${ut('admin.pending_keys.outline_label', { ns: 'message' })}</b>\n<code>${result.accessUrl}</code>\n\n`;
						}
						await ctx.telegram.sendMessage(user.telegram_id, msg, { parse_mode: 'HTML' });

						ctx.i18n.locale = savedLocale;
					}
				} catch (notifyError) {
					console.error('⚠️ Не удалось уведомить пользователя:', notifyError.message);
				}
			}

			// Обновляем список pending ключей
			await this.handleAdminPendingKeys(ctx);
		} catch (error) {
			console.error('❌ Ошибка активации ключа:', error);
			await ctx.answerCbQuery(t('admin.pending_keys.activate_error', { ns: 'message', error: error.message }), { show_alert: true });
		}
	}

	async handleAdminBroadcast(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		const keyboard = KeyboardUtils.createBroadcastAudienceKeyboard(t);
		const message = t('admin.broadcast.select_audience', { ns: 'message' });

		try {
			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (editError) {
			if (editError.description && editError.description.includes('message is not modified')) {
				console.log('Рассылка: сообщение не изменилось');
			} else {
				console.error('Ошибка редактирования сообщения рассылки:', editError.message);
			}
		}
	}

	async handleBroadcastAudience(ctx, audience) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		pendingBroadcast.set(ctx.from.id, { audience });

		await ctx.reply(t('admin.broadcast.prompt', { ns: 'message' }));
	}

	async handleAdminSettings(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		const message = [
			`⚙️ <b>${t('admin.settings.title', { ns: 'message' })}</b>`,
			'',
			t('admin.settings.description', { ns: 'message' })
		].join('\n');

		const keyboard = KeyboardUtils.createAdminKeyboard(t);

		try {
			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (editError) {
			if (editError.description && editError.description.includes('message is not modified')) {
				console.log('Настройки: сообщение не изменилось');
			} else {
				console.error('Ошибка редактирования настроек:', editError.message);
			}
		}
	}

	async handlePendingWithdrawals(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const withdrawals = await this.db.getPendingWithdrawals();
			const message = await AdminMessages.pendingWithdrawalsList(
				t,
				withdrawals,
				this.db.getUserById.bind(this.db)
			);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения pending выплат:', error);
			await ctx.editMessageText(
				t('admin.loading_error', { ns: 'message' }),
				KeyboardUtils.createAdminKeyboard(t)
			);
		}
	}

	async handleBroadcast(ctx) {
		if (this.broadcastCallbacks) {
			return this.broadcastCallbacks.handleBroadcastMenu(ctx);
		}

		await ctx.answerCbQuery('Broadcast functionality not available');
	}
}

module.exports = AdminCallbacks;
