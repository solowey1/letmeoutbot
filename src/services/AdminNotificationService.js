const { ADMIN_IDS } = require('../config/constants');

/**
 * Сервис для отправки уведомлений администраторам
 */
class AdminNotificationService {
	constructor(bot, database) {
		this.bot = bot;
		this.db = database;
	}

	/**
	 * Отправить уведомление всем админам
	 * @param {string} message - Текст сообщения
	 * @param {Object} options - Опции для отправки (parse_mode, keyboard и т.д.)
	 */
	async notifyAdmins(message, options = {}) {
		const defaultOptions = {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
			...options
		};

		const results = [];

		for (const adminId of ADMIN_IDS) {
			try {
				await this.bot.telegram.sendMessage(adminId, message, defaultOptions);
				results.push({ adminId, success: true });
				console.log(`✅ Уведомление отправлено админу ${adminId}`);
			} catch (error) {
				results.push({ adminId, success: false, error: error.message });
				console.error(`❌ Ошибка отправки уведомления админу ${adminId}:`, error.message);
			}
		}

		return results;
	}

	/**
	 * Уведомление о новой покупке ключа
	 * @param {Object} payment - Данные платежа
	 * @param {Object} key - Данные ключа (если создан)
	 * @param {Object} user - Данные пользователя
	 * @param {Object} plan - Данные плана
	 * @param {string} status - Статус создания ключа ('success' | 'pending' | 'failed')
	 * @param {string} error - Текст ошибки (если есть)
	 */
	async notifyNewPurchase(payment, key, user, plan, status = 'success', error = null) {
		const statusEmoji = {
			success: '✅',
			pending: '⏳',
			failed: '❌'
		};

		const statusText = {
			success: 'Ключ успешно создан',
			pending: 'Ключ ожидает активации',
			failed: 'Ошибка создания ключа'
		};

		const userName = user.username
			? `@${user.username}`
			: `${user.first_name || 'Unknown'} ${user.last_name || ''}`.trim();

		let message = [
			`${statusEmoji[status]} <b>Новая покупка!</b>`,
			'',
			`👤 <b>Пользователь:</b> ${userName}`,
			`🆔 <b>Telegram ID:</b> <code>${user.telegram_id}</code>`,
			'',
			`📦 <b>План:</b> ${plan.name}`,
			`💰 <b>Сумма:</b> ${payment.amount} ⭐`,
			`🔑 <b>Статус:</b> ${statusText[status]}`
		];

		if (key && key.id) {
			message.push(`📋 <b>Key ID:</b> ${key.id}`);
			message.push(`⏰ <b>Истекает:</b> ${new Date(key.expires_at).toLocaleString('ru-RU')}`);
		}

		if (error) {
			message.push('');
			message.push(`⚠️ <b>Ошибка:</b> ${error}`);
		}

		message.push('');
		message.push(`🕐 ${new Date().toLocaleString('ru-RU')}`);

		await this.notifyAdmins(message.join('\n'));
	}

	/**
	 * Уведомление о ключах, истекающих завтра
	 */
	async notifyExpiringKeysTomorrow() {
		try {
			// Получаем ключи, истекающие завтра
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(0, 0, 0, 0);

			const dayAfterTomorrow = new Date(tomorrow);
			dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

			const expiringKeys = await this.db.getKeysExpiringBetween(tomorrow, dayAfterTomorrow);

			if (expiringKeys.length === 0) {
				console.log('📊 Завтра не истекает ни один ключ');
				return;
			}

			// Группируем по планам
			const keysByPlan = expiringKeys.reduce((acc, key) => {
				if (!acc[key.plan_id]) {
					acc[key.plan_id] = [];
				}
				acc[key.plan_id].push(key);
				return acc;
			}, {});

			let message = [
				'⏰ <b>Ключи, истекающие завтра</b>',
				'',
				`📊 <b>Всего:</b> ${expiringKeys.length} ключей`,
				''
			];

			// Добавляем разбивку по планам
			for (const [planId, keys] of Object.entries(keysByPlan)) {
				message.push(`  • ${planId}: ${keys.length} шт.`);
			}

			message.push('');
			message.push(`📅 ${tomorrow.toLocaleDateString('ru-RU')}`);

			await this.notifyAdmins(message.join('\n'));

		} catch (error) {
			console.error('❌ Ошибка отправки уведомления об истекающих ключах:', error);
		}
	}

	/**
	 * Еженедельная сводка по ключам и покупкам
	 */
	async sendWeeklySummary() {
		try {
			const now = new Date();
			const weekAgo = new Date(now);
			weekAgo.setDate(weekAgo.getDate() - 7);

			// Получаем статистику
			const stats = await this.getWeeklyStats(weekAgo, now);

			let message = [
				'📊 <b>Недельная сводка</b>',
				`📅 ${weekAgo.toLocaleDateString('ru-RU')} - ${now.toLocaleDateString('ru-RU')}`,
				'',
				'<b>💰 Продажи:</b>',
				`  • Всего платежей: ${stats.payments.total}`,
				`  • Успешных: ${stats.payments.completed}`,
				`  • Ожидают активации: ${stats.payments.pending_activation}`,
				`  • Не удалось: ${stats.payments.failed}`,
				`  • Доход: ${stats.payments.totalRevenue} ⭐`,
				'',
				'<b>🔑 Ключи:</b>',
				`  • Создано новых: ${stats.keys.created}`,
				`  • Активных сейчас: ${stats.keys.active}`,
				`  • Истекло: ${stats.keys.expired}`,
				''
			];

			// Топ планов
			if (stats.topPlans.length > 0) {
				message.push('<b>📈 Популярные планы:</b>');
				stats.topPlans.forEach((plan, index) => {
					message.push(`  ${index + 1}. ${plan.plan_id}: ${plan.count} покупок`);
				});
				message.push('');
			}

			// Статистика по пользователям
			message.push('<b>👥 Пользователи:</b>');
			message.push(`  • Всего: ${stats.users.total}`);
			message.push(`  • Новых за неделю: ${stats.users.newThisWeek}`);
			message.push(`  • С активными ключами: ${stats.users.withActiveKeys}`);

			await this.notifyAdmins(message.join('\n'));

		} catch (error) {
			console.error('❌ Ошибка отправки недельной сводки:', error);
		}
	}

	/**
	 * Получить статистику за период
	 * @param {Date} startDate - Начало периода
	 * @param {Date} endDate - Конец периода
	 * @returns {Promise<Object>}
	 */
	async getWeeklyStats(startDate, endDate) {
		const [
			payments,
			keys,
			users,
			topPlans
		] = await Promise.all([
			this.db.getPaymentStats(startDate, endDate),
			this.db.getKeyStats(startDate, endDate),
			this.db.getUserStats(startDate, endDate),
			this.db.getTopPlans(startDate, endDate, 5)
		]);

		return {
			payments,
			keys,
			users,
			topPlans
		};
	}
}

module.exports = AdminNotificationService;
