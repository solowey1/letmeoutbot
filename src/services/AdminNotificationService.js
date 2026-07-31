const { ADMIN_IDS } = require('../config/constants');

/**
 * Сервис для отправки уведомлений администраторам
 */
class AdminNotificationService {
	constructor(bot, database, i18nService = null) {
		this.bot = bot;
		this.db = database;
		this.t = i18nService
			? (key, params = {}) => i18nService.t('ru', key, { ns: 'message', ...params })
			: (key) => key;
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
				await this.bot.api.sendMessage(adminId, message, defaultOptions);
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

		const t = this.t;
		const statusText = {
			success: t('admin.notifications.new_purchase.key_created'),
			pending: t('admin.notifications.new_purchase.key_pending'),
			failed: t('admin.notifications.new_purchase.key_failed'),
		};

		const userName = user.username
			? `@${user.username}`
			: `${user.first_name || 'Unknown'} ${user.last_name || ''}`.trim();

		let message = [
			`${statusEmoji[status]} <b>${t('admin.notifications.new_purchase.title')}</b>`,
			'',
			`👤 <b>${t('admin.notifications.new_purchase.field_user')}:</b> ${userName}`,
			`🆔 <b>${t('admin.notifications.new_purchase.field_id')}:</b> <code>${user.telegram_id}</code>`,
			'',
			`📦 <b>${t('admin.notifications.new_purchase.field_plan')}:</b> ${plan.name}`,
			`💰 <b>${t('admin.notifications.new_purchase.field_amount')}:</b> ${payment.amount} ⭐`,
			`🔑 <b>${t('admin.notifications.new_purchase.field_status')}:</b> ${statusText[status]}`
		];

		if (key && key.id) {
			message.push(`📋 <b>${t('admin.notifications.new_purchase.field_key_id')}:</b> ${key.id}`);
			message.push(`⏰ <b>${t('admin.notifications.new_purchase.field_expires')}:</b> ${new Date(key.expires_at).toLocaleString('ru-RU')}`);
		}

		if (error) {
			message.push('');
			message.push(`⚠️ <b>${t('admin.notifications.new_purchase.field_error')}:</b> ${error}`);
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

			const t = this.t;
			let message = [
				`⏰ <b>${t('admin.notifications.expiring_tomorrow.title')}</b>`,
				'',
				`📊 <b>${t('admin.notifications.expiring_tomorrow.field_total')}:</b> ${expiringKeys.length} ${t('admin.notifications.expiring_tomorrow.keys_count')}`,
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

			const t = this.t;
			let message = [
				`📊 <b>${t('admin.notifications.weekly_summary.title')}</b>`,
				`📅 ${weekAgo.toLocaleDateString('ru-RU')} - ${now.toLocaleDateString('ru-RU')}`,
				'',
				`<b>💰 ${t('admin.notifications.weekly_summary.sales_title')}:</b>`,
				`  • ${t('admin.notifications.weekly_summary.field_total_payments')}: ${stats.payments.total}`,
				`  • ${t('admin.notifications.weekly_summary.field_successful')}: ${stats.payments.completed}`,
				`  • ${t('admin.notifications.weekly_summary.field_pending')}: ${stats.payments.pending_activation}`,
				`  • ${t('admin.notifications.weekly_summary.field_failed')}: ${stats.payments.failed}`,
				`  • ${t('admin.notifications.weekly_summary.field_revenue')}: ${stats.payments.totalRevenue} ⭐`,
				'',
				`<b>🔑 ${t('admin.notifications.weekly_summary.keys_title')}:</b>`,
				`  • ${t('admin.notifications.weekly_summary.field_created')}: ${stats.keys.created}`,
				`  • ${t('admin.notifications.weekly_summary.field_active')}: ${stats.keys.active}`,
				`  • ${t('admin.notifications.weekly_summary.field_expired')}: ${stats.keys.expired}`,
				''
			];

			// Топ планов
			if (stats.topPlans.length > 0) {
				message.push(`<b>📈 ${t('admin.notifications.weekly_summary.popular_plans_title')}:</b>`);
				stats.topPlans.forEach((plan, index) => {
					message.push(`  ${index + 1}. ${plan.plan_id}: ${plan.count} ${t('admin.notifications.weekly_summary.purchases_label')}`);
				});
				message.push('');
			}

			// Статистика по пользователям
			message.push(`<b>👥 ${t('admin.notifications.weekly_summary.users_title')}:</b>`);
			message.push(`  • ${t('admin.notifications.weekly_summary.field_total_users')}: ${stats.users.total}`);
			message.push(`  • ${t('admin.notifications.weekly_summary.field_new_this_week')}: ${stats.users.newThisWeek}`);
			message.push(`  • ${t('admin.notifications.weekly_summary.field_with_active')}: ${stats.users.withActiveKeys}`);

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
