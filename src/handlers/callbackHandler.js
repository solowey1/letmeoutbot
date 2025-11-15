const { CALLBACK_ACTIONS, MESSAGES, ADMIN_IDS } = require('../config/constants');
const KeyboardUtils = require('../utils/keyboards');
const PlanService = require('../services/PlanService');

class CallbackHandler {
    constructor(database, paymentService, subscriptionService) {
        this.db = database;
        this.paymentService = paymentService;
        this.subscriptionService = subscriptionService;
    }

    async handleCallback(ctx) {
        const callbackData = ctx.callbackQuery.data;
        const userId = ctx.from.id;

        try {
            // Отвечаем на callback запрос чтобы убрать загрузку
            await ctx.answerCbQuery();

            // Роутинг callback'ов
            if (callbackData === CALLBACK_ACTIONS.BACK_TO_MENU) {
                await this.handleBackToMenu(ctx);
            } else if (callbackData === CALLBACK_ACTIONS.BUY_PLAN) {
                await this.handleShowPlans(ctx);
            } else if (callbackData.startsWith(`${CALLBACK_ACTIONS.BUY_PLAN}_`)) {
                const planId = callbackData.split('_').slice(2).join('_');
                await this.handleShowPlanDetails(ctx, planId);
            } else if (callbackData.startsWith(`${CALLBACK_ACTIONS.CONFIRM_PURCHASE}_`)) {
                const planId = callbackData.split('_').slice(2).join('_');
                await this.handleConfirmPurchase(ctx, planId);
            } else if (callbackData.startsWith('confirm_payment_')) {
                const planId = callbackData.split('_').slice(2).join('_');
                await this.handleCreateInvoice(ctx, planId);
            } else if (callbackData.startsWith('checkout_')) {
                const planId = callbackData.split('_').slice(1).join('_');
                await this.handleDirectCheckout(ctx, planId);
            } else if (callbackData === CALLBACK_ACTIONS.MY_KEYS) {
                await this.handleMySubscriptions(ctx);
            } else if (callbackData.startsWith('sub_details_')) {
                const subscriptionId = parseInt(callbackData.split('_')[2]);
                await this.handleSubscriptionDetails(ctx, subscriptionId);
            } else if (callbackData.startsWith('sub_stats_')) {
                const subscriptionId = parseInt(callbackData.split('_')[2]);
                await this.handleSubscriptionStats(ctx, subscriptionId);
            } else if (callbackData === 'help') {
                await this.handleHelp(ctx);
            } else if (callbackData === 'download_apps') {
                await this.handleDownloadApps(ctx);
            } else if (callbackData === 'support') {
                await this.handleSupport(ctx);
            } else if (callbackData === CALLBACK_ACTIONS.ADMIN_PANEL) {
                await this.handleAdminPanel(ctx);
            } else if (callbackData === CALLBACK_ACTIONS.ADMIN_USERS) {
                await this.handleAdminUsers(ctx);
            } else if (callbackData === CALLBACK_ACTIONS.ADMIN_STATS) {
                await this.handleAdminStats(ctx);
            } else {
                // Неизвестный callback
                await ctx.editMessageText('❌ Неизвестная команда', KeyboardUtils.createBackToMenuKeyboard());
            }
        } catch (error) {
            console.error('Ошибка обработки callback:', error);
            await ctx.answerCbQuery('❌ Произошла ошибка, попробуйте еще раз');
        }
    }

    async handleBackToMenu(ctx) {
        const keyboard = KeyboardUtils.createMainMenu();
        await ctx.editMessageText(MESSAGES.WELCOME, { 
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleShowPlans(ctx) {
        const isAdmin = ADMIN_IDS.includes(ctx.from.id);
        const plans = PlanService.getAllPlans(isAdmin);
        const keyboard = KeyboardUtils.createPlansKeyboard(isAdmin);
        
        let message = '💎 <b>Выберите тарифный план:</b>\n\n';
        
        plans.forEach(plan => {
            const formatted = PlanService.formatPlanForDisplay(plan);
            message += `<b>${formatted.displayName}</b>\n`;
            message += `${formatted.fullDescription}\n\n`;
        });

        message += `💳 Нажмите на нужный тариф для мгновенной покупки`;

        await ctx.editMessageText(message, {
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleShowPlanDetails(ctx, planId) {
        const plan = PlanService.getPlanById(planId);
        if (!plan) {
            await ctx.editMessageText('❌ План не найден', KeyboardUtils.createBackToMenuKeyboard());
            return;
        }

        const formatted = PlanService.formatPlanForDisplay(plan);
        const savings = PlanService.calculateSavings(plan);
        
        let message = `<b>${formatted.displayName}</b>\n\n`;
        message += `📦 Что включено:\n`;
        message += `• Объем данных: ${formatted.displayDescription.split(' на ')[0]}\n`;
        message += `• Период действия: ${formatted.displayDescription.split(' на ')[1]}\n`;
        message += `• Безлимитная скорость\n`;
        message += `• Поддержка всех устройств\n`;
        message += `• Техническая поддержка\n\n`;
        
        if (savings > 0) {
            message += `💰 <i>Экономия: ${savings}</i> ⭐\n\n`;
        }
        
        message += `💵 <b>Стоимость: ${formatted.displayPrice}</b>\n\n`;
        message += `<i>${plan.description}</i>`;

        const keyboard = KeyboardUtils.createPlanDetailsKeyboard(planId);
        
        await ctx.editMessageText(message, {
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleConfirmPurchase(ctx, planId) {
        const plan = PlanService.getPlanById(planId);
        if (!plan) {
            await ctx.editMessageText('❌ План не найден', KeyboardUtils.createBackToMenuKeyboard());
            return;
        }

        const formatted = PlanService.formatPlanForDisplay(plan);
        
        let message = `🛒 <b>Подтверждение покупки</b>\n\n`;
        message += `📦 Тариф: ${formatted.displayName}\n`;
        message += `💾 Объем: ${formatted.displayDescription.split(' на ')[0]}\n`;
        message += `⏰ Период: ${formatted.displayDescription.split(' на ')[1]}\n`;
        message += `💰 К оплате: ${formatted.displayPrice}\n\n`;
        message += `После оплаты вы мгновенно получите VPN ключ для подключения.\n\n`;
        message += `⭐ Оплата происходит через Telegram Stars`;

        const keyboard = KeyboardUtils.createPaymentConfirmationKeyboard(planId);
        
        await ctx.editMessageText(message, {
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleDirectCheckout(ctx, planId) {
        const plan = PlanService.getPlanById(planId);
        if (!plan) {
            await ctx.editMessageText('❌ План не найден', KeyboardUtils.createBackToMenuKeyboard());
            return;
        }

        const formatted = PlanService.formatPlanForDisplay(plan);
        const savings = PlanService.calculateSavings(plan);
        
        let message = `💳 <b>Оформление покупки</b>\n\n`;
        message = `<b>${formatted.displayName}</b>\n\n`;
        message += `📦 Что включено:\n`;
        message += `• Объем данных: ${formatted.displayDescription.split(' на ')[0]}\n`;
        message += `• Период действия: ${formatted.displayDescription.split(' на ')[1]}\n`;
        message += `• Безлимитная скорость\n`;
        message += `• Поддержка всех устройств\n`;
        message += `• Техническая поддержка\n\n`;
        
        if (savings > 0) {
            message += `💰 <i>Экономия: ${savings}</i> ⭐\n\n`;
        }
        
        message += `💵 <b>Стоимость: ${formatted.displayPrice}</b>\n\n`;
        message += `<i>${plan.description}</i>\n\n`;
        message += `После оплаты вы мгновенно получите VPN ключ для подключения.\n\n`;
        message += `⭐ Оплата происходит через Telegram Stars`;

        const keyboard = KeyboardUtils.createDirectCheckoutKeyboard(planId);
        
        await ctx.editMessageText(message, {
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleCreateInvoice(ctx, planId) {
        try {
            const plan = PlanService.getPlanById(planId);
            if (!plan) {
                throw new Error('План не найден');
            }

            // Получаем или создаем пользователя
            let user = await this.db.getUser(ctx.from.id);
            if (!user) {
                await this.db.createUser(ctx.from.id, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
                user = await this.db.getUser(ctx.from.id);
            }

            // Создаем инвойс
            const { paymentId, invoice } = await this.paymentService.createInvoice(user.id, plan);

            // Отправляем инвойс пользователю
            await ctx.replyWithInvoice({
                title: invoice.title,
                description: invoice.description,
                payload: invoice.payload,
                provider_token: invoice.provider_token,
                currency: invoice.currency,
                prices: invoice.prices,
                photo_url: undefined,
                photo_size: undefined,
                photo_width: undefined,
                photo_height: undefined,
                need_name: false,
                need_phone_number: false,
                need_email: false,
                need_shipping_address: false,
                send_phone_number_to_provider: false,
                send_email_to_provider: false,
                is_flexible: false
            });

            await ctx.editMessageText('💳 Инвойс отправлен! Нажмите "Оплатить" чтобы завершить покупку.', 
                KeyboardUtils.createBackToMenuKeyboard());

        } catch (error) {
            console.error('Ошибка создания инвойса:', error);
            await ctx.editMessageText('❌ Ошибка создания платежа. Попробуйте позже.', 
                KeyboardUtils.createBackToMenuKeyboard());
        }
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

            let message = `🔑 <b>Детали ключа</b>\n\n`;
            message += `📦 Тариф: ${subscription.plan.displayName}\n`;
            message += `🟢 Статус: ${subscription.status === 'active' ? 'Активен' : 'Неактивен'}\n\n`;
            
            if (subscription.usage) {
                const usage = subscription.usage;
                message += `📊 <b>Использование:</b>\n`;
                message += `• Использовано: ${usage.formattedUsed} (${usage.usagePercentage}%)\n`;
                message += `• Лимит: ${usage.formattedLimit}\n`;
                message += `• Остается: ${usage.formattedRemaining}\n`;
                message += `• Дней до окончания: ${usage.daysRemaining}\n\n`;
            }

            if (subscription.access_url) {
                message += `🔐 <b>Ключ доступа:</b>\n`;
                message += `<code>${subscription.access_url}</code>\n\n`;
                message += `📱 <b>Как подключиться:</b>\n`;
                message += `1. Скачайте Outline Client\n`;
                message += `2. Скопируйте ключ выше\n`;
                message += `3. Добавьте ключ в приложение`;
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

            let message = `📊 <b>Статистика использования</b>\n\n`;
            
            // Создаем визуальный индикатор прогресса
            const progressBar = this.createProgressBar(usage.usagePercentage);
            
            message += `📈 ${progressBar} ${usage.usagePercentage}%\n\n`;
            message += `📥 Использовано: ${usage.formattedUsed}\n`;
            message += `📦 Лимит: ${usage.formattedLimit}\n`;
            message += `📤 Остается: ${usage.formattedRemaining}\n\n`;
            message += `⏰ Дней до окончания: ${usage.daysRemaining}\n`;
            
            if (usage.isOverLimit) {
                message += `\n🚨 <b>Лимит превышен!</b> Доступ приостановлен.`;
            } else if (usage.usagePercentage > 90) {
                message += `\n⚠️ <b>Внимание!</b> Скоро закончится трафик.`;
            }
            
            if (usage.isExpired) {
                message += `\n🕐 <b>Ключ истёк!</b> Купите новый для продолжения использования.`;
            } else if (usage.daysRemaining <= 3) {
                message += `\n⏰ <b>Ключ скоро истекает!</b> Рекомендуем купить новый.`;
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

    async handleHelp(ctx) {
        const keyboard = KeyboardUtils.createHelpKeyboard();
        await ctx.editMessageText(MESSAGES.HELP, {
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleDownloadApps(ctx) {
        const keyboard = KeyboardUtils.createAppsDownloadKeyboard();
        const message = `📱 <b>Скачать Outline Client:</b>\n\n` +
                       `Выберите приложение для вашей операционной системы:\n\n` +
                       `🔸 <b>Android</b> - Google Play Store\n` +
                       `🔸 <b>iOS</b> - App Store\n` +
                       `🔸 <b>Windows</b> - Прямая ссылка\n` +
                       `🔸 <b>macOS</b> - Прямая ссылка\n\n` +
                       `После установки добавьте ваш ключ доступа в приложение.`;
        
        await ctx.editMessageText(message, {
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleSupport(ctx) {
        const message = `🆘 <b>Поддержка</b>\n\n` +
                       `Если у вас возникли проблемы:\n\n` +
                       `1. Проверьте правильность ключа доступа\n` +
                       `2. Убедитесь, что приложение Outline обновлено\n` +
                       `3. Попробуйте переподключиться\n` +
                       `4. Проверьте наличие трафика у ключа\n\n` +
                       `📧 Для технической поддержки обратитесь к администратору.`;
        
        const keyboard = KeyboardUtils.createBackToMenuKeyboard();
        
        await ctx.editMessageText(message, {
            ...keyboard,
            parse_mode: 'HTML'
        });
    }

    async handleAdminPanel(ctx) {
        if (!ADMIN_IDS.includes(ctx.from.id)) {
            await ctx.answerCbQuery('❌ Недостаточно прав доступа');
            return;
        }

        const keyboard = KeyboardUtils.createAdminKeyboard();
        const message = `⚙️ <b>Административная панель</b>\n\n` +
                       `Выберите нужный раздел для управления:`;
        
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
            
            let message = `👥 <b>Пользователи (последние 10):</b>\n\n`;
            
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
            
            let message = `📊 <b>Статистика бота:</b>\n\n`;
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

    createProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
}

module.exports = CallbackHandler;