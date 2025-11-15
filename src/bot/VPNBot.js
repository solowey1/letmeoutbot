require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('cron');

// Импорты сервисов и моделей
const Database = require('../models/Database');
const OutlineService = require('../services/OutlineService');
const PaymentService = require('../services/PaymentService');
const SubscriptionService = require('../services/SubscriptionService');
const NotificationService = require('../services/NotificationService');
const I18nService = require('../services/I18nService');

// Импорты обработчиков
const CallbackHandler = require('../handlers/callbackHandler');
const CommandHandlers = require('../handlers/listeners/CommandHandlers');
const PaymentHandlers = require('../handlers/listeners/PaymentHandlers');
const MessageHandlers = require('../handlers/listeners/MessageHandlers');
const I18nMiddleware = require('../middleware/i18nMiddleware');

// Импорты конфигурации
const config = require('../config/database');

class VPNBot {
	constructor() {
		// Инициализируем Telegraf бота
		this.bot = new Telegraf(config.telegram.token, config.telegram.options);
        
		// Инициализируем базу данных и сервисы
		this.db = new Database(config.database.path);
		this.i18nService = new I18nService();
		this.outlineService = new OutlineService(config.outline.apiUrl);
		this.paymentService = new PaymentService(this.db);
		this.subscriptionService = new SubscriptionService(this.db, this.outlineService);
		this.notificationService = new NotificationService(this.bot, this.i18nService, this.db);

		// Инициализируем обработчики
		this.callbackHandler = new CallbackHandler(this.db, this.paymentService, this.subscriptionService);
		this.commandHandlers = new CommandHandlers(this.db);
		this.paymentHandlers = new PaymentHandlers(this.paymentService, this.subscriptionService);
		this.messageHandlers = new MessageHandlers(this.db);

		// Подключаем i18n middleware
		const i18nMiddleware = new I18nMiddleware(this.i18nService, this.db);
		this.bot.use(i18nMiddleware.middleware());

		// Настраиваем обработчики событий и cron задачи
		this.setupHandlers();
		this.setupCronJobs();
        
		// Передаем ссылку на сервис уведомлений в SubscriptionService
		this.subscriptionService.sendNotificationToUser = this.notificationService.sendNotificationToUser.bind(this.notificationService);
	}

	setupHandlers() {
		// Регистрируем обработчики команд
		this.commandHandlers.register(this.bot);

		// Регистрируем обработчики платежей
		this.paymentHandlers.register(this.bot);

		// Регистрируем обработчики сообщений
		this.messageHandlers.register(this.bot);

		// Обработка callback запросов
		this.bot.on('callback_query', async (ctx) => {
			await this.callbackHandler.handleCallback(ctx);
		});

		// Обработка ошибок
		this.bot.catch((err) => {
			console.error('Ошибка бота:', err);
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