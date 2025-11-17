const { Markup } = require('telegraf');
const { NOTIFICATION_TYPES, CALLBACK_ACTIONS } = require('../config/constants');

class NotificationService {
	constructor(bot, i18nService, database) {
		this.bot = bot;
		this.i18nService = i18nService;
		this.database = database;
	}

	// Метод для отправки уведомлений пользователям
	async sendNotificationToUser(telegramId, notification) {
		try {
			// Получаем язык пользователя из БД
			const user = await this.database.getUser(telegramId);
			const locale = user?.language || 'en';
			const t = (key, params) => this.i18nService.t(locale, key, params);

			let message = '';
			let keyboard = null;

			switch (notification.type) {
				case NOTIFICATION_TYPES.TRAFFIC_WARNING_5:
					message = `⚠️ <b>${t('notifications.traffic_warning_5.title')}</b>\n\n`;
					message += t('notifications.traffic_warning_5.message', {
						percentage: notification.data.remainingPercentage,
						days: notification.data.daysRemaining
					});
					break;

				case NOTIFICATION_TYPES.TRAFFIC_WARNING_1:
					message = `🚨 <b>${t('notifications.traffic_warning_1.title')}</b>\n\n`;
					message += t('notifications.traffic_warning_1.message', {
						percentage: notification.data.remainingPercentage,
						days: notification.data.daysRemaining
					});
					break;

				case NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED:
					message = `❌ <b>${t('notifications.traffic_exhausted.title')}</b>\n\n`;
					message += t('notifications.traffic_exhausted.message', {
						percentage: notification.data.usagePercentage
					});
					break;

				case NOTIFICATION_TYPES.TIME_WARNING_3:
					message = `⏰ <b>${t('notifications.time_warning_3.title')}</b>\n\n`;
					message += t('notifications.time_warning_3.message', {
						days: notification.data.daysRemaining,
						percentage: notification.data.usagePercentage
					});
					break;

				case NOTIFICATION_TYPES.TIME_WARNING_1:
					message = `🔥 <b>${t('notifications.time_warning_1.title')}</b>\n\n`;
					message += t('notifications.time_warning_1.message', {
						days: notification.data.daysRemaining,
						percentage: notification.data.usagePercentage
					});
					break;

				case NOTIFICATION_TYPES.TIME_EXPIRED:
					message = `⛔ <b>${t('notifications.time_expired.title')}</b>\n\n`;
					message += t('notifications.time_expired.message');
					break;

				default:
					message = `📢 ${t('notifications.default')}`;
			}

			// Добавляем кнопки для всех типов уведомлений
			keyboard = Markup.inlineKeyboard([
				[Markup.button.callback(t('buttons.buy.key'), CALLBACK_ACTIONS.KEYS.BUY)],
				[Markup.button.callback(t('buttons.my_keys'), CALLBACK_ACTIONS.KEYS.MENU)]
			]);

			await this.bot.telegram.sendMessage(telegramId, message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
				...keyboard
			});

			console.log(`✅ Уведомление отправлено пользователю ${telegramId}: ${notification.type}`);

		} catch (error) {
			console.error(`❌ Ошибка отправки уведомления пользователю ${telegramId}:`, error.message);
		}
	}

	// Метод для отправки админ-уведомлений
	async sendAdminNotification(message, adminIds) {
		try {
			for (const adminId of adminIds) {
				await this.bot.telegram.sendMessage(adminId, `🔧 <b>Admin:</b> ${message}`, {
					parse_mode: 'HTML',
					disable_web_page_preview: true
				});
			}
			console.log(`✅ Админ-уведомления отправлены: ${adminIds.length} получателей`);
		} catch (error) {
			console.error('❌ Ошибка отправки админ-уведомлений:', error.message);
		}
	}

	// Метод для отправки массовых уведомлений
	async broadcastMessage(userIds, message, keyboard = null) {
		let successCount = 0;
		let failureCount = 0;

		for (const userId of userIds) {
			try {
				const options = {
					parse_mode: 'HTML',
					disable_web_page_preview: true
				};

				if (keyboard) {
					Object.assign(options, keyboard);
				}

				await this.bot.telegram.sendMessage(userId, message, options);
				successCount++;

				// Небольшая задержка между отправками
				await new Promise(resolve => setTimeout(resolve, 100));
			} catch (error) {
				failureCount++;
				console.error(`❌ Не удалось отправить сообщение пользователю ${userId}:`, error.message);
			}
		}

		console.log(`📢 Массовая рассылка завершена: ${successCount} успешно, ${failureCount} ошибок`);
		return { success: successCount, failed: failureCount };
	}
}

module.exports = NotificationService;
