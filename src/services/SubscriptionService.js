const { SUBSCRIPTION_STATUS, NOTIFICATION_TYPES } = require('../config/constants');
const PlanService = require('./PlanService');
const moment = require('moment');

class SubscriptionService {
    constructor(database, outlineService) {
        this.db = database;
        this.outlineService = outlineService;
    }

    async createSubscription(userId, planId, paymentId) {
        try {
            const plan = PlanService.getPlanById(planId);
            if (!plan) {
                throw new Error('План не найден');
            }

            const expiresAt = PlanService.calculateExpiryDate(plan);
            
            // Создаем запись подписки в БД
            const subscriptionId = await this.db.createSubscription(
                userId, 
                planId, 
                plan.dataLimit, 
                expiresAt
            );

            // Обновляем платеж, связав его с подпиской
            await this.db.updatePayment(paymentId, {
                subscription_id: subscriptionId
            });

            return subscriptionId;
        } catch (error) {
            console.error('Ошибка создания подписки:', error);
            throw error;
        }
    }

    async activateSubscription(subscriptionId, userName) {
        try {
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription) {
                throw new Error('Подписка не найдена');
            }

            // Создаем VPN ключ через Outline API
            const keyData = await this.outlineService.createSubscriptionKey(subscription, userName);

            // Обновляем подписку с данными ключа
            await this.db.updateSubscription(subscriptionId, {
                outline_key_id: keyData.keyId,
                access_url: keyData.accessUrl,
                status: SUBSCRIPTION_STATUS.ACTIVE
            });

            return {
                subscription: await this.db.getSubscriptionById(subscriptionId),
                accessUrl: keyData.accessUrl
            };
        } catch (error) {
            console.error('Ошибка активации подписки:', error);
            // Помечаем подписку как проблемную
            await this.db.updateSubscription(subscriptionId, {
                status: SUBSCRIPTION_STATUS.SUSPENDED
            });
            throw error;
        }
    }

    async getUserActiveSubscriptions(userId) {
        try {
            const subscriptions = await this.db.getActiveSubscriptions(userId);
            
            // Обогащаем данные информацией о планах
            return subscriptions.map(subscription => {
                const plan = PlanService.getPlanById(subscription.plan_id);
                return {
                    ...subscription,
                    plan: plan ? PlanService.formatPlanForDisplay(plan) : null
                };
            });
        } catch (error) {
            console.error('Ошибка получения активных подписок:', error);
            throw error;
        }
    }

    async getSubscriptionDetails(subscriptionId, withUsageStats = true) {
        try {
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription) {
                throw new Error('Подписка не найдена');
            }

            const plan = PlanService.getPlanById(subscription.plan_id);
            let usageStats = null;

            if (withUsageStats && subscription.outline_key_id) {
                usageStats = await this.getUsageStats(subscriptionId);
            }

            return {
                ...subscription,
                plan: plan ? PlanService.formatPlanForDisplay(plan) : null,
                usage: usageStats
            };
        } catch (error) {
            console.error('Ошибка получения деталей подписки:', error);
            throw error;
        }
    }

    async updateUsageStats(subscriptionId) {
        try {
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription || !subscription.outline_key_id) {
                return false;
            }

            const usageInfo = await this.outlineService.checkAndUpdateUsage(
                subscriptionId,
                subscription.outline_key_id,
                subscription.data_used
            );

            if (usageInfo.updated) {
                // Обновляем использование в БД
                await this.db.updateSubscription(subscriptionId, {
                    data_used: usageInfo.newUsage
                });

                // Логируем использование
                if (usageInfo.additionalUsage > 0) {
                    await this.db.logUsage(subscriptionId, usageInfo.additionalUsage);
                }

                // Проверяем лимиты
                await this.checkLimits(subscriptionId);
            }

            return usageInfo.updated;
        } catch (error) {
            console.error('Ошибка обновления статистики использования:', error);
            return false;
        }
    }

    async getUsageStats(subscriptionId) {
        try {
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription) {
                return null;
            }

            const plan = PlanService.getPlanById(subscription.plan_id);
            if (!plan) {
                return null;
            }

            // Обновляем актуальную статистику
            await this.updateUsageStats(subscriptionId);
            
            // Получаем обновленные данные
            const updatedSubscription = await this.db.getSubscriptionById(subscriptionId);
            
            const usagePercentage = this.outlineService.calculateUsagePercentage(
                updatedSubscription.data_used,
                updatedSubscription.data_limit
            );

            const remainingData = Math.max(0, updatedSubscription.data_limit - updatedSubscription.data_used);
            const daysRemaining = moment(updatedSubscription.expires_at).diff(moment(), 'days');

            return {
                used: updatedSubscription.data_used,
                limit: updatedSubscription.data_limit,
                remaining: remainingData,
                usagePercentage,
                daysRemaining: Math.max(0, daysRemaining),
                formattedUsed: this.outlineService.formatBytes(updatedSubscription.data_used),
                formattedLimit: this.outlineService.formatBytes(updatedSubscription.data_limit),
                formattedRemaining: this.outlineService.formatBytes(remainingData),
                isExpired: moment(updatedSubscription.expires_at).isBefore(moment()),
                isOverLimit: updatedSubscription.data_used >= updatedSubscription.data_limit
            };
        } catch (error) {
            console.error('Ошибка получения статистики использования:', error);
            return null;
        }
    }

    async checkLimits(subscriptionId) {
        try {
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription || subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
                return false;
            }

            const now = moment();
            const expiryDate = moment(subscription.expires_at);
            const isExpired = expiryDate.isBefore(now);
            const isOverLimit = subscription.data_used >= subscription.data_limit;

            if (isExpired || isOverLimit) {
                // Блокируем ключ
                if (subscription.outline_key_id) {
                    await this.outlineService.suspendKey(subscription.outline_key_id);
                }

                // Обновляем статус подписки
                await this.db.updateSubscription(subscriptionId, {
                    status: SUBSCRIPTION_STATUS.SUSPENDED
                });

                return true; // Подписка заблокирована
            }

            return false; // Все в порядке
        } catch (error) {
            console.error('Ошибка проверки лимитов:', error);
            return false;
        }
    }

    async extendSubscription(subscriptionId, additionalDays, additionalData = 0) {
        try {
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription) {
                throw new Error('Подписка не найдена');
            }

            const currentExpiry = moment(subscription.expires_at);
            const newExpiry = currentExpiry.add(additionalDays, 'days').toDate();
            const newDataLimit = subscription.data_limit + additionalData;

            // Обновляем подписку
            await this.db.updateSubscription(subscriptionId, {
                expires_at: newExpiry,
                data_limit: newDataLimit,
                status: SUBSCRIPTION_STATUS.ACTIVE // Реактивируем если была заблокирована
            });

            // Обновляем лимиты в Outline если есть ключ
            if (subscription.outline_key_id) {
                await this.outlineService.reactivateKey(subscription.outline_key_id, newDataLimit);
            }

            return await this.db.getSubscriptionById(subscriptionId);
        } catch (error) {
            console.error('Ошибка продления подписки:', error);
            throw error;
        }
    }

    async cancelSubscription(subscriptionId, reason = 'User cancellation') {
        try {
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription) {
                throw new Error('Подписка не найдена');
            }

            // Удаляем ключ из Outline
            if (subscription.outline_key_id) {
                await this.outlineService.deleteAccessKey(subscription.outline_key_id);
            }

            // Обновляем статус подписки
            await this.db.updateSubscription(subscriptionId, {
                status: SUBSCRIPTION_STATUS.EXPIRED
            });

            console.log(`Подписка ${subscriptionId} отменена: ${reason}`);
            return true;
        } catch (error) {
            console.error('Ошибка отмены подписки:', error);
            throw error;
        }
    }

    async getSubscriptionUsageReport(subscriptionId, days = 30) {
        try {
            // Здесь можно реализовать получение детального отчета об использовании
            // за указанное количество дней
            const subscription = await this.db.getSubscriptionById(subscriptionId);
            if (!subscription) {
                return null;
            }

            // Пока возвращаем базовую информацию
            const usageStats = await this.getUsageStats(subscriptionId);
            
            return {
                subscriptionId,
                reportPeriod: days,
                currentUsage: usageStats,
                generatedAt: new Date()
            };
        } catch (error) {
            console.error('Ошибка генерации отчета:', error);
            return null;
        }
    }

    // Метод для массовой проверки всех активных подписок (для cron задач)
    async checkAllActiveSubscriptions() {
        try {
            console.log('🔄 Проверка всех активных подписок...');
            
            const activeSubscriptions = await this.db.getAllActiveSubscriptions();
            console.log(`📊 Найдено ${activeSubscriptions.length} активных подписок`);
            
            let notificationsSent = 0;
            let subscriptionsBlocked = 0;

            for (const subscription of activeSubscriptions) {
                try {
                    // Обновляем статистику использования
                    if (subscription.outline_key_id) {
                        const actualUsage = await this.outlineService.getKeyDataUsage(subscription.outline_key_id);
                        if (actualUsage > subscription.data_used) {
                            await this.db.updateSubscription(subscription.id, {
                                data_used: actualUsage
                            });
                            subscription.data_used = actualUsage;
                        }
                    }

                    // Проверяем пороговые значения и отправляем уведомления
                    const notificationsNeeded = await this.checkSubscriptionThresholds(subscription);
                    
                    if (notificationsNeeded.length > 0) {
                        for (const notification of notificationsNeeded) {
                            await this.sendNotificationToUser(subscription.telegram_id, notification);
                            notificationsSent++;
                        }
                    }

                    // Проверяем, нужно ли заблокировать подписку
                    const shouldBlock = await this.checkSubscriptionLimits(subscription.id);
                    if (shouldBlock) {
                        subscriptionsBlocked++;
                    }

                } catch (subscriptionError) {
                    console.error(`❌ Ошибка проверки подписки ${subscription.id}:`, subscriptionError.message);
                }
            }

            console.log(`✅ Проверка завершена: отправлено ${notificationsSent} уведомлений, заблокировано ${subscriptionsBlocked} подписок`);
            return true;

        } catch (error) {
            console.error('❌ Ошибка массовой проверки подписок:', error);
            return false;
        }
    }

    // Проверяет пороговые значения и возвращает необходимые уведомления
    async checkSubscriptionThresholds(subscription) {
        const notifications = [];
        const now = moment();
        const expiryDate = moment(subscription.expires_at);
        const daysRemaining = expiryDate.diff(now, 'days');
        
        const usagePercentage = (subscription.data_used / subscription.data_limit) * 100;
        const remainingPercentage = 100 - usagePercentage;

        // Проверяем временные пороги
        if (daysRemaining <= 3 && daysRemaining > 1) {
            const alreadySent = await this.db.checkNotificationSent(
                subscription.id, 
                NOTIFICATION_TYPES.TIME_WARNING_3, 
                3
            );
            if (!alreadySent) {
                notifications.push({
                    type: NOTIFICATION_TYPES.TIME_WARNING_3,
                    threshold: 3,
                    data: { daysRemaining, usagePercentage: Math.round(usagePercentage) }
                });
            }
        }

        if (daysRemaining <= 1 && daysRemaining > 0) {
            const alreadySent = await this.db.checkNotificationSent(
                subscription.id,
                NOTIFICATION_TYPES.TIME_WARNING_1,
                1
            );
            if (!alreadySent) {
                notifications.push({
                    type: NOTIFICATION_TYPES.TIME_WARNING_1,
                    threshold: 1,
                    data: { daysRemaining, usagePercentage: Math.round(usagePercentage) }
                });
            }
        }

        if (daysRemaining <= 0) {
            const alreadySent = await this.db.checkNotificationSent(
                subscription.id,
                NOTIFICATION_TYPES.TIME_EXPIRED,
                0
            );
            if (!alreadySent) {
                notifications.push({
                    type: NOTIFICATION_TYPES.TIME_EXPIRED,
                    threshold: 0,
                    data: { daysRemaining, usagePercentage: Math.round(usagePercentage) }
                });
            }
        }

        // Проверяем пороги трафика
        if (remainingPercentage <= 5 && remainingPercentage > 1) {
            const alreadySent = await this.db.checkNotificationSent(
                subscription.id,
                NOTIFICATION_TYPES.TRAFFIC_WARNING_5,
                5
            );
            if (!alreadySent) {
                notifications.push({
                    type: NOTIFICATION_TYPES.TRAFFIC_WARNING_5,
                    threshold: 5,
                    data: { remainingPercentage: Math.round(remainingPercentage), daysRemaining }
                });
            }
        }

        if (remainingPercentage <= 1 && remainingPercentage > 0) {
            const alreadySent = await this.db.checkNotificationSent(
                subscription.id,
                NOTIFICATION_TYPES.TRAFFIC_WARNING_1,
                1
            );
            if (!alreadySent) {
                notifications.push({
                    type: NOTIFICATION_TYPES.TRAFFIC_WARNING_1,
                    threshold: 1,
                    data: { remainingPercentage: Math.round(remainingPercentage), daysRemaining }
                });
            }
        }

        if (usagePercentage >= 100) {
            const alreadySent = await this.db.checkNotificationSent(
                subscription.id,
                NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED,
                100
            );
            if (!alreadySent) {
                notifications.push({
                    type: NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED,
                    threshold: 100,
                    data: { usagePercentage: Math.round(usagePercentage), daysRemaining }
                });
            }
        }

        // Записываем отправляемые уведомления в БД
        for (const notification of notifications) {
            await this.db.createNotification(
                subscription.id,
                notification.type,
                notification.threshold
            );
        }

        return notifications;
    }
}

module.exports = SubscriptionService;