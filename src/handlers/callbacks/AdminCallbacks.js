const { ADMIN_IDS } = require('../../config/constants');
const KeyboardUtils = require('../../utils/keyboards');

class AdminCallbacks {
	constructor(database, paymentService, subscriptionService) {
		this.db = database;
		this.paymentService = paymentService;
		this.subscriptionService = subscriptionService;
	}

	async handleAdminPanel(ctx) {
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery('❌ Недостаточно прав доступа');
			return;
		}

		const keyboard = KeyboardUtils.createAdminKeyboard();
		const message = '⚙️ <b>Административная панель</b>\n\n' +
			'Выберите нужный раздел для управления:';

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleAdminUsers(ctx) {
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery('❌ Недостаточно прав доступа');
			return;
		}

		try {
			const users = await this.db.getAllUsers(10);

			let message = '👥 <b>Пользователи (последние 10):</b>\n\n';

			users.forEach((user, index) => {
				const registrationDate = new Date(user.created_at).toLocaleDateString('ru-RU');
				message += `${index + 1}. <b>${user.first_name}</b> (@${user.username || 'без username'})\n`;
				message += `   ID: ${user.telegram_id}\n`;
				message += `   Ключей: ${user.subscription_count}\n`;
				message += `   Регистрация: ${registrationDate}\n\n`;
			});

			const keyboard = KeyboardUtils.createAdminKeyboard();

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения пользователей:', error);
			await ctx.editMessageText('❌ Ошибка загрузки пользователей',
				KeyboardUtils.createAdminKeyboard());
		}
	}

	async handleAdminStats(ctx) {
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery('❌ Недостаточно прав доступа');
			return;
		}

		try {
			const stats = await this.db.getStats();

			let message = '📊 <b>Статистика бота:</b>\n\n';
			message += `👥 Всего пользователей: ${stats.totalUsers}\n`;
			message += `🔑 Активных ключей: ${stats.activeSubscriptions}\n`;
			message += `💰 Общая выручка: ${stats.totalRevenue} ⭐\n`;
			message += `💳 Успешных платежей: ${stats.totalPayments}\n`;

			const keyboard = KeyboardUtils.createAdminKeyboard();

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения статистики:', error);
			await ctx.editMessageText('❌ Ошибка загрузки статистики',
				KeyboardUtils.createAdminKeyboard());
		}
	}
}

module.exports = AdminCallbacks;
