const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../config/constants');
const PlanService = require('../services/PlanService');

class KeyboardUtils {
    static createMainMenu() {
        return Markup.inlineKeyboard([
            [Markup.button.callback('💎 Купить VPN', CALLBACK_ACTIONS.BUY_PLAN)],
            [Markup.button.callback('📋 Мои подписки', CALLBACK_ACTIONS.MY_SUBSCRIPTIONS)],
            [Markup.button.callback('ℹ️ Помощь', 'help')],
        ]);
    }

    static createPlansKeyboard() {
        const plans = PlanService.getAllPlans();
        const buttons = [];

        // Группируем кнопки по 2 в ряд для лучшего отображения
        for (let i = 0; i < plans.length; i += 2) {
            const row = [];
            
            const plan1 = plans[i];
            if (plan1) {
                const formatted1 = PlanService.formatPlanForDisplay(plan1);
                row.push(Markup.button.callback(
                    `${formatted1.displayName} - ${formatted1.displayPrice}`,
                    `${CALLBACK_ACTIONS.BUY_PLAN}_${plan1.id}`
                ));
            }

            const plan2 = plans[i + 1];
            if (plan2) {
                const formatted2 = PlanService.formatPlanForDisplay(plan2);
                row.push(Markup.button.callback(
                    `${formatted2.displayName} - ${formatted2.displayPrice}`,
                    `${CALLBACK_ACTIONS.BUY_PLAN}_${plan2.id}`
                ));
            }

            buttons.push(row);
        }

        buttons.push([Markup.button.callback('◀️ Назад в меню', CALLBACK_ACTIONS.BACK_TO_MENU)]);
        
        return Markup.inlineKeyboard(buttons);
    }

    static createPlanDetailsKeyboard(planId) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('💳 Купить', `${CALLBACK_ACTIONS.CONFIRM_PURCHASE}_${planId}`)],
            [Markup.button.callback('◀️ Выбрать другой план', CALLBACK_ACTIONS.BUY_PLAN)],
            [Markup.button.callback('🏠 Главное меню', CALLBACK_ACTIONS.BACK_TO_MENU)]
        ]);
    }

    static createSubscriptionsKeyboard(subscriptions) {
        const buttons = [];

        if (subscriptions && subscriptions.length > 0) {
            subscriptions.forEach((sub, index) => {
                const plan = PlanService.getPlanById(sub.plan_id);
                if (plan) {
                    const formatted = PlanService.formatPlanForDisplay(plan);
                    const status = sub.status === 'active' ? '🟢' : '🔴';
                    buttons.push([
                        Markup.button.callback(
                            `${status} ${formatted.displayName}`,
                            `sub_details_${sub.id}`
                        )
                    ]);
                }
            });

            buttons.push([Markup.button.callback('➕ Купить еще', CALLBACK_ACTIONS.BUY_PLAN)]);
        } else {
            buttons.push([Markup.button.callback('💎 Купить первый VPN', CALLBACK_ACTIONS.BUY_PLAN)]);
        }

        buttons.push([Markup.button.callback('◀️ Назад в меню', CALLBACK_ACTIONS.BACK_TO_MENU)]);
        
        return Markup.inlineKeyboard(buttons);
    }

    static createSubscriptionDetailsKeyboard(subscriptionId) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('📊 Статистика', `sub_stats_${subscriptionId}`)],
            [Markup.button.callback('🔄 Продлить', `${CALLBACK_ACTIONS.EXTEND_SUBSCRIPTION}_${subscriptionId}`)],
            [Markup.button.callback('◀️ К подпискам', CALLBACK_ACTIONS.MY_SUBSCRIPTIONS)],
            [Markup.button.callback('🏠 Главное меню', CALLBACK_ACTIONS.BACK_TO_MENU)]
        ]);
    }

    static createPaymentConfirmationKeyboard(planId) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('✅ Подтверждаю покупку', `confirm_payment_${planId}`)],
            [Markup.button.callback('❌ Отменить', CALLBACK_ACTIONS.BUY_PLAN)]
        ]);
    }

    static createAdminKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Пользователи', CALLBACK_ACTIONS.ADMIN_USERS),
                Markup.button.callback('📊 Статистика', CALLBACK_ACTIONS.ADMIN_STATS)
            ],
            [
                Markup.button.callback('💰 Платежи', 'admin_payments'),
                Markup.button.callback('🔑 Подписки', 'admin_subscriptions')
            ],
            [
                Markup.button.callback('📢 Рассылка', 'admin_broadcast'),
                Markup.button.callback('⚙️ Настройки', 'admin_settings')
            ],
            [Markup.button.callback('◀️ Назад', CALLBACK_ACTIONS.BACK_TO_MENU)]
        ]);
    }

    static createBackToMenuKeyboard() {
        return Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Главное меню', CALLBACK_ACTIONS.BACK_TO_MENU)]
        ]);
    }

    static createHelpKeyboard() {
        return Markup.inlineKeyboard([
            [Markup.button.callback('💎 Купить VPN', CALLBACK_ACTIONS.BUY_PLAN)],
            [Markup.button.callback('📱 Скачать приложения', 'download_apps')],
            [Markup.button.callback('🆘 Поддержка', 'support')],
            [Markup.button.callback('◀️ Назад в меню', CALLBACK_ACTIONS.BACK_TO_MENU)]
        ]);
    }

    static createAppsDownloadKeyboard() {
        return Markup.inlineKeyboard([
            [
                Markup.button.url('📱 Android', 'https://play.google.com/store/apps/details?id=org.outline.android.client'),
                Markup.button.url('📱 iOS', 'https://apps.apple.com/app/outline-app/id1356177741')
            ],
            [
                Markup.button.url('💻 Windows', 'https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe'),
                Markup.button.url('💻 macOS', 'https://s3.amazonaws.com/outline-releases/client/macos/stable/Outline-Client.dmg')
            ],
            [Markup.button.callback('◀️ Назад', 'help')]
        ]);
    }

    static createErrorKeyboard(backAction = CALLBACK_ACTIONS.BACK_TO_MENU) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Попробовать снова', 'retry')],
            [Markup.button.callback('◀️ Назад', backAction)]
        ]);
    }

    // Утилиты для создания динамических клавиатур
    static createPaginatedKeyboard(items, currentPage, itemsPerPage, callbackPrefix, backAction) {
        const buttons = [];
        const startIndex = currentPage * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, items.length);
        
        // Добавляем элементы текущей страницы
        for (let i = startIndex; i < endIndex; i++) {
            const item = items[i];
            buttons.push([Markup.button.callback(item.name, `${callbackPrefix}_${item.id}`)]);
        }

        // Добавляем навигацию
        const navButtons = [];
        if (currentPage > 0) {
            navButtons.push(Markup.button.callback('◀️', `page_${callbackPrefix}_${currentPage - 1}`));
        }
        
        navButtons.push(Markup.button.callback(`${currentPage + 1}/${Math.ceil(items.length / itemsPerPage)}`, 'current_page'));
        
        if (endIndex < items.length) {
            navButtons.push(Markup.button.callback('▶️', `page_${callbackPrefix}_${currentPage + 1}`));
        }

        if (navButtons.length > 1) {
            buttons.push(navButtons);
        }

        buttons.push([Markup.button.callback('◀️ Назад', backAction)]);
        
        return Markup.inlineKeyboard(buttons);
    }

    static removeKeyboard() {
        return Markup.removeKeyboard();
    }
}

module.exports = KeyboardUtils;