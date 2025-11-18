const { ADMIN_IDS } = require('../../../config/constants');
const KeyboardUtils = require('../../../utils/keyboards');
const { AdminMessages } = require('../../../services/messages');

class AdminCallbacks {
	constructor(database, paymentService, keysService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	async handleAdminPanel(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		const keyboard = KeyboardUtils.createAdminKeyboard(t);
		const message = AdminMessages.adminPanel(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
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

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения пользователей:', error);
			await ctx.editMessageText(
				t('admin.loading_error', { ns: 'message' }),
				KeyboardUtils.createAdminKeyboard(t)
			);
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

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения статистики:', error);
			await ctx.editMessageText(
				t('admin.loading_error', { ns: 'message' }),
				KeyboardUtils.createAdminKeyboard(t)
			);
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

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения pending подписок:', error);
			await ctx.editMessageText(
				t('admin.loading_error', { ns: 'message' }),
				KeyboardUtils.createAdminKeyboard(t)
			);
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

			if (!withdrawals || withdrawals.length === 0) {
				const message = '📜 Нет ожидающих выплат';
				const keyboard = KeyboardUtils.createAdminKeyboard(t);

				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
				return;
			}

			// Формируем список
			const list = await Promise.all(withdrawals.map(async (w) => {
				const user = await this.db.getUserById(w.user_id);
				const userName = user?.username || user?.first_name || 'Unknown';
				const date = new Date(w.requested_at).toLocaleDateString();

				return `🆔 ${w.id} | ${userName} (${user?.telegram_id})\n💰 ${w.amount} ⭐ | ${date}`;
			}));

			const message = [
				'<b>📜 Ожидающие выплаты</b>',
				'',
				...list,
				'',
				'Используйте /approve_withdrawal <id> или /reject_withdrawal <id>'
			].join('\n');

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
}

module.exports = AdminCallbacks;
