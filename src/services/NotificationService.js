const { Markup } = require('telegraf');
const { NOTIFICATION_TYPES, CALLBACK_ACTIONS } = require('../config/constants');

class NotificationService {
    constructor(bot) {
        this.bot = bot;
    }

    // Метод для отправки уведомлений пользователям
    async sendNotificationToUser(telegramId, notification) {
        try {
            let message = '';
            let keyboard = null;

            switch (notification.type) {
                case NOTIFICATION_TYPES.TRAFFIC_WARNING_5:
                    message = `⚠️ <b>Трафик заканчивается!</b>\n\n`;
                    message += `Осталось всего ${notification.data.remainingPercentage}% от трафика.\n`;
                    message += `Дней до окончания: ${notification.data.daysRemaining}\n\n`;
                    message += `💡 Рекомендуем продлить подписку, чтобы не остаться без VPN!`;
                    break;

                case NOTIFICATION_TYPES.TRAFFIC_WARNING_1:
                    message = `🚨 <b>КРИТИЧНО: Трафик на исходе!</b>\n\n`;
                    message += `Остался всего ${notification.data.remainingPercentage}% от трафика!\n`;
                    message += `Дней до окончания: ${notification.data.daysRemaining}\n\n`;
                    message += `⚡ Срочно продлите подписку, иначе доступ будет заблокирован!`;
                    break;

                case NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED:
                    message = `❌ <b>Трафик исчерпан!</b>\n\n`;
                    message += `Весь трафик использован (${notification.data.usagePercentage}%).\n`;
                    message += `Доступ к VPN заблокирован.\n\n`;
                    message += `🔄 Купите новый план для восстановления доступа.`;
                    break;

                case NOTIFICATION_TYPES.TIME_WARNING_3:
                    message = `⏰ <b>Подписка скоро истекает!</b>\n\n`;
                    message += `Осталось ${notification.data.daysRemaining} дней до окончания.\n`;
                    message += `Использовано трафика: ${notification.data.usagePercentage}%\n\n`;
                    message += `💡 Самое время продлить подписку по выгодной цене!`;
                    break;

                case NOTIFICATION_TYPES.TIME_WARNING_1:
                    message = `🔥 <b>ВНИМАНИЕ: Подписка истекает завтра!</b>\n\n`;
                    message += `Остался всего ${notification.data.daysRemaining} день!\n`;
                    message += `Использовано трафика: ${notification.data.usagePercentage}%\n\n`;
                    message += `⚡ Продлите прямо сейчас, чтобы не потерять доступ к VPN!`;
                    break;

                case NOTIFICATION_TYPES.TIME_EXPIRED:
                    message = `⛔ <b>Подписка истекла!</b>\n\n`;
                    message += `Срок действия VPN закончился.\n`;
                    message += `Доступ заблокирован.\n\n`;
                    message += `🛒 Оформите новую подписку для продолжения использования VPN.`;
                    break;

                default:
                    message = `📢 Уведомление о состоянии вашей VPN подписки.`;
            }

            // Добавляем кнопки для всех типов уведомлений
            keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('💎 Купить VPN', CALLBACK_ACTIONS.BUY_PLAN)],
                [Markup.button.callback('📋 Мои подписки', CALLBACK_ACTIONS.MY_SUBSCRIPTIONS)]
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