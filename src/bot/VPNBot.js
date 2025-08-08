require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('cron');

// Импорты сервисов и моделей
const Database = require('../models/Database');
const OutlineService = require('../services/OutlineService');
const PaymentService = require('../services/PaymentService');
const SubscriptionService = require('../services/SubscriptionService');
const NotificationService = require('../services/NotificationService');

// Импорты обработчиков
const CallbackHandler = require('../handlers/callbackHandler');

// Импорты утилит
const KeyboardUtils = require('../utils/keyboards');

// Импорты констант и конфигурации
const { MESSAGES, BOT_COMMANDS, ADMIN_IDS } = require('../config/constants');
const config = require('../config/database');

class VPNBot {
    constructor() {
        // Инициализируем Telegraf бота
        this.bot = new Telegraf(config.telegram.token, config.telegram.options);
        
        // Инициализируем базу данных и сервисы
        this.db = new Database(config.database.path);
        this.outlineService = new OutlineService(config.outline.apiUrl);
        this.paymentService = new PaymentService(this.db);
        this.subscriptionService = new SubscriptionService(this.db, this.outlineService);
        this.notificationService = new NotificationService(this.bot);
        
        // Инициализируем обработчики
        this.callbackHandler = new CallbackHandler(this.db, this.paymentService, this.subscriptionService);
        
        // Настраиваем обработчики событий и cron задачи
        this.setupHandlers();
        this.setupCronJobs();
        
        // Передаем ссылку на сервис уведомлений в SubscriptionService
        this.subscriptionService.sendNotificationToUser = this.notificationService.sendNotificationToUser.bind(this.notificationService);
    }

    setupHandlers() {
        // Команда /start
        this.bot.start(async (ctx) => {
            try {
                await this.handleStart(ctx);
            } catch (error) {
                console.error('Ошибка в команде /start:', error);
                await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
            }
        });

        // Команда /help
        this.bot.help(async (ctx) => {
            try {
                const keyboard = KeyboardUtils.createHelpKeyboard();
                await ctx.reply(MESSAGES.HELP, {
                    ...keyboard,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                });
            } catch (error) {
                console.error('Ошибка в команде /help:', error);
                await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
            }
        });

        // Команда /admin (только для администраторов)
        this.bot.command('admin', async (ctx) => {
            try {
                if (!ADMIN_IDS.includes(ctx.from.id)) {
                    await ctx.reply('❌ У вас нет прав доступа к административной панели.');
                    return;
                }

                const keyboard = KeyboardUtils.createAdminKeyboard();
                const message = `⚙️ <b>Административная панель</b>\n\nВыберите нужный раздел:`;
                
                await ctx.reply(message, {
                    ...keyboard,
                    parse_mode: 'HTML'
                });
            } catch (error) {
                console.error('Ошибка в команде /admin:', error);
                await ctx.reply('❌ Произошла ошибка в административной панели.');
            }
        });

        // Обработка callback запросов
        this.bot.on('callback_query', async (ctx) => {
            await this.callbackHandler.handleCallback(ctx);
        });

        // Обработка успешных платежей
        this.bot.on('successful_payment', async (ctx) => {
            try {
                await this.handleSuccessfulPayment(ctx);
            } catch (error) {
                console.error('Ошибка обработки платежа:', error);
                await ctx.reply('❌ Произошла ошибка при обработке платежа. Обратитесь в поддержку.');
            }
        });

        // Обработка пре-чекаут запросов
        this.bot.on('pre_checkout_query', async (ctx) => {
            try {
                await ctx.answerPreCheckoutQuery(true);
            } catch (error) {
                console.error('Ошибка пре-чекаута:', error);
                await ctx.answerPreCheckoutQuery(false, 'Произошла ошибка валидации платежа');
            }
        });

        // Обработка всех остальных сообщений
        this.bot.on('message', async (ctx) => {
            try {
                if (ctx.message.text) {
                    await this.showMainMenu(ctx);
                }
            } catch (error) {
                console.error('Ошибка обработки сообщения:', error);
                await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
            }
        });

        // Обработка ошибок
        this.bot.catch((err, ctx) => {
            console.error('Ошибка бота:', err);
        });
    }

    async handleStart(ctx) {
        const telegramId = ctx.from.id;
        const username = ctx.from.username;
        const firstName = ctx.from.first_name;
        const lastName = ctx.from.last_name;

        // Создаем или обновляем пользователя
        let user = await this.db.getUser(telegramId);
        
        if (!user) {
            await this.db.createUser(telegramId, username, firstName, lastName);
            user = await this.db.getUser(telegramId);
        } else {
            // Обновляем данные пользователя если изменились
            const updates = {};
            if (user.username !== username) updates.username = username;
            if (user.first_name !== firstName) updates.first_name = firstName;
            if (user.last_name !== lastName) updates.last_name = lastName;
            
            if (Object.keys(updates).length > 0) {
                await this.db.updateUser(telegramId, updates);
            }
        }

        await this.showMainMenu(ctx);
    }

    async showMainMenu(ctx) {
        const keyboard = KeyboardUtils.createMainMenu();
        await ctx.reply(MESSAGES.WELCOME, {
            ...keyboard,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    }

    async handleSuccessfulPayment(ctx) {
        console.log('📢 Получен successful_payment от пользователя:', ctx.from.id);
        
        const payment = ctx.message.successful_payment;
        const payloadData = payment.invoice_payload;

        console.log('💰 Данные платежа:', {
            payload: payloadData,
            telegramChargeId: payment.telegram_payment_charge_id,
            providerChargeId: payment.provider_payment_charge_id,
            totalAmount: payment.total_amount
        });

        // Извлекаем ID платежа из payload
        const paymentId = this.paymentService.extractPaymentIdFromPayload(payloadData);
        
        if (!paymentId) {
            console.error('❌ Не удалось извлечь ID платежа из payload:', payloadData);
            await ctx.reply('❌ Ошибка обработки платежа. Обратитесь в поддержку.');
            return;
        }

        console.log('🔍 Извлечен ID платежа:', paymentId);

        try {
            console.log('🔄 Обновляем статус платежа...');
            
            const completedPayment = await this.paymentService.processSuccessfulPayment(
                paymentId,
                payment.telegram_payment_charge_id,
                payment.provider_payment_charge_id
            );

            if (!completedPayment) {
                throw new Error('Платеж не найден');
            }

            console.log('✅ Платеж обновлен:', completedPayment);
            console.log('📝 Создаем подписку...');

            const subscriptionId = await this.subscriptionService.createSubscription(
                completedPayment.user_id,
                completedPayment.plan_id,
                paymentId
            );

            console.log('✅ Подписка создана с ID:', subscriptionId);
            console.log('🔑 Активируем подписку и создаем VPN ключ...');

            const activationResult = await this.subscriptionService.activateSubscription(
                subscriptionId,
                ctx.from.first_name
            );

            console.log('✅ Подписка активирована:', activationResult);
            console.log('📤 Отправляем сообщение пользователю...');

            await this.sendAccessKeyMessage(ctx, completedPayment, activationResult);

            console.log('✅ Процесс завершен успешно!');

        } catch (error) {
            console.error('❌ Ошибка активации подписки:', error);
            console.error('❌ Stack trace:', error.stack);
            
            await this.paymentService.processFailedPayment(paymentId, error.message);
            
            await ctx.reply(`❌ Ошибка активации подписки: ${error.message}\n\nОбратитесь в поддержку для решения проблемы.`);
        }
    }

    async sendAccessKeyMessage(ctx, payment, activationResult) {
        const { subscription, accessUrl } = activationResult;
        
        let message = `✅ <b>Платёж успешно обработан!</b>\n\n`;
        message += `🎉 Ваша VPN подписка активирована!\n\n`;
        message += `🔑 <b>Ключ доступа:</b>\n`;
        message += `<code>${accessUrl}</code>\n\n`;
        message += `📱 <b>Как подключиться:</b>\n`;
        message += `1. Скачайте приложение Outline Client\n`;
        message += `2. Скопируйте ключ доступа выше\n`;
        message += `3. Добавьте ключ в приложение\n`;
        message += `4. Наслаждайтесь безопасным интернетом!\n\n`;
        message += `📊 Вы можете проверить статистику использования в разделе "Мои подписки"`;

        const keyboard = KeyboardUtils.createAppsDownloadKeyboard();

        await ctx.reply(message, {
            ...keyboard,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    }

    setupCronJobs() {
        // Проверяем лимиты подписок каждые 30 минут
        const limitsCheckJob = new cron.CronJob('*/30 * * * *', async () => {
            try {
                console.log('Запуск проверки лимитов подписок...');
                await this.subscriptionService.checkAllActiveSubscriptions();
            } catch (error) {
                console.error('Ошибка в cron задаче проверки лимитов:', error);
            }
        });

        limitsCheckJob.start();
        console.log('✅ Cron задачи настроены');
    }

    async start() {
        try {
            console.log('🤖 VPN Bot запускается...');
            
            await this.bot.launch();
            console.log('✅ VPN Bot успешно запущен!');
            
            // Устанавливаем команды бота
            await this.bot.telegram.setMyCommands([
                { command: 'start', description: 'Начать работу с ботом' },
                { command: 'help', description: 'Помощь и информация' }
            ]);

            // Graceful stop
            process.once('SIGINT', () => {
                console.log('Получен SIGINT, завершаю работу...');
                this.stop();
            });

            process.once('SIGTERM', () => {
                console.log('Получен SIGTERM, завершаю работу...');
                this.stop();
            });

        } catch (error) {
            console.error('❌ Ошибка запуска бота:', error);
            this.db.close();
            process.exit(1);
        }
    }

    stop() {
        this.bot.stop('SIGINT');
        this.db.close();
        process.exit(0);
    }

    // Геттеры для доступа к сервисам (если нужны извне)
    getBot() {
        return this.bot;
    }

    getDatabase() {
        return this.db;
    }

    getNotificationService() {
        return this.notificationService;
    }
}

module.exports = VPNBot;