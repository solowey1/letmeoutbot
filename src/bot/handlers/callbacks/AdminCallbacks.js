const { ADMIN_IDS } = require('../../../config/constants');
const KeyboardUtils = require('../../../utils/keyboards');
const { AdminMessages } = require('../../../services/messages');

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

			// Normalize stats object
			const normalizedStats = {
				totalUsers: stats.totalUsers || 0,
				activeKeys: stats.activeKeys || stats.active_keys || 0,
				totalRevenue: stats.totalRevenue || 0,
				successfulPayments: stats.totalPayments || stats.successfulPayments || 0
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

	async handleAdminPendingKeys(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const pendingKeys = await this.db.getPendingKeys();
			const message = await AdminMessages.pendingKeysList(t, pendingKeys, this.db.getUserById.bind(this.db));
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

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
			console.error('Ошибка получения pending подписок:', error);
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

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Pending выплаты: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения pending выплат:', error);
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
