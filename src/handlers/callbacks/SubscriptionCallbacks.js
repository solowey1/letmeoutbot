const { MESSAGES } = require('../../config/constants');
const KeyboardUtils = require('../../utils/keyboards');

class SubscriptionCallbacks {
	constructor(database, paymentService, subscriptionService) {
		this.db = database;
		this.paymentService = paymentService;
		this.subscriptionService = subscriptionService;
	}

	async handleMySubscriptions(ctx) {
		try {
			let user = await this.db.getUser(ctx.from.id);
			if (!user) {
				await ctx.editMessageText(MESSAGES.NO_ACTIVE_SUBS, {
					...KeyboardUtils.createMainMenu(),
					parse_mode: 'HTML'
				});
				return;
			}

			const subscriptions = await this.subscriptionService.getUserActiveSubscriptions(user.id);

			if (subscriptions.length === 0) {
				await ctx.editMessageText(MESSAGES.NO_ACTIVE_SUBS, {
					...KeyboardUtils.createSubscriptionsKeyboard([]),
					parse_mode: 'HTML'
				});
				return;
			}

			let message = '📋 <b>Ваши активные ключи:</b>\n\n';

			for (let i = 0; i < subscriptions.length; i++) {
				const sub = subscriptions[i];
				const usage = await this.subscriptionService.getUsageStats(sub.id);

				message += `${i + 1}. ${sub.plan.displayName}\n`;
				message += `   • Статус: ${sub.status === 'active' ? '🟢 Активен' : '🔴 Неактивен'}\n`;

				if (usage) {
					message += `   • Использовано: ${usage.formattedUsed} из ${usage.formattedLimit} (${usage.usagePercentage}%)\n`;
					message += `   • Осталось дней: ${usage.daysRemaining}\n`;
				}

				message += `   • Действует до: ${new Date(sub.expires_at).toLocaleDateString('ru-RU')}\n\n`;
			}

			const keyboard = KeyboardUtils.createSubscriptionsKeyboard(subscriptions);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения ключей:', error);
			await ctx.editMessageText('❌ У вас нет действующих ключей',
				KeyboardUtils.createBackToMenuKeyboard());
		}
	}

	async handleSubscriptionDetails(ctx, subscriptionId) {
		try {
			const subscription = await this.subscriptionService.getSubscriptionDetails(subscriptionId, true);
			if (!subscription) {
				await ctx.editMessageText('❌ Ключ не найден',
					KeyboardUtils.createBackToMenuKeyboard());
				return;
			}

			let message = '🔑 <b>Детали ключа</b>\n\n';
			message += `📦 Тариф: ${subscription.plan.displayName}\n`;
			message += `🟢 Статус: ${subscription.status === 'active' ? 'Активен' : 'Неактивен'}\n\n`;

			if (subscription.usage) {
				const usage = subscription.usage;
				message += '📊 <b>Использование:</b>\n';
				message += `• Использовано: ${usage.formattedUsed} (${usage.usagePercentage}%)\n`;
				message += `• Лимит: ${usage.formattedLimit}\n`;
				message += `• Остается: ${usage.formattedRemaining}\n`;
				message += `• Дней до окончания: ${usage.daysRemaining}\n\n`;
			}

			if (subscription.access_url) {
				message += '🔐 <b>Ключ доступа:</b>\n';
				message += `<code>${subscription.access_url}</code>\n\n`;
				message += '📱 <b>Как подключиться:</b>\n';
				message += '1. Скачайте Outline Client\n';
				message += '2. Скопируйте ключ выше\n';
				message += '3. Добавьте ключ в приложение';
			}

			const keyboard = KeyboardUtils.createSubscriptionDetailsKeyboard(subscriptionId);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения деталей ключа:', error);
			await ctx.editMessageText('❌ Ошибка загрузки деталей ключа',
				KeyboardUtils.createBackToMenuKeyboard());
		}
	}

	async handleSubscriptionStats(ctx, subscriptionId) {
		try {
			const usage = await this.subscriptionService.getUsageStats(subscriptionId);
			if (!usage) {
				await ctx.editMessageText('❌ Статистика недоступна',
					KeyboardUtils.createBackToMenuKeyboard());
				return;
			}

			let message = '📊 <b>Статистика использования</b>\n\n';

			// Создаем визуальный индикатор прогресса
			const progressBar = this.createProgressBar(usage.usagePercentage);

			message += `📈 ${progressBar} ${usage.usagePercentage}%\n\n`;
			message += `📥 Использовано: ${usage.formattedUsed}\n`;
			message += `📦 Лимит: ${usage.formattedLimit}\n`;
			message += `📤 Остается: ${usage.formattedRemaining}\n\n`;
			message += `⏰ Дней до окончания: ${usage.daysRemaining}\n`;

			if (usage.isOverLimit) {
				message += '\n🚨 <b>Лимит превышен!</b> Доступ приостановлен.';
			} else if (usage.usagePercentage > 90) {
				message += '\n⚠️ <b>Внимание!</b> Скоро закончится трафик.';
			}

			if (usage.isExpired) {
				message += '\n🕐 <b>Ключ истёк!</b> Купите новый для продолжения использования.';
			} else if (usage.daysRemaining <= 3) {
				message += '\n⏰ <b>Ключ скоро истекает!</b> Рекомендуем купить новый.';
			}

			const keyboard = KeyboardUtils.createSubscriptionDetailsKeyboard(subscriptionId);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения статистики:', error);
			await ctx.editMessageText('❌ Ошибка загрузки статистики',
				KeyboardUtils.createBackToMenuKeyboard());
		}
	}

	createProgressBar(percentage, length = 10) {
		const filled = Math.round((percentage / 100) * length);
		const empty = length - filled;
		return '█'.repeat(filled) + '░'.repeat(empty);
	}
}

module.exports = SubscriptionCallbacks;
