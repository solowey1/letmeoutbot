require('dotenv').config();
const { Telegraf } = require('telegraf');

// Импорты сервисов и моделей
const SQLiteDatabase = require('../models/Database');
const PostgresDatabase = require('../models/PostgresDatabase');
const SupabaseDatabase = require('../models/SupabaseDatabase');
const OutlineService = require('../services/OutlineService');
const XRayService = require('../services/XRayService');
const PaymentService = require('../services/PaymentService');
const KeysService = require('../services/KeysService');
const NotificationService = require('../services/NotificationService');
const AdminNotificationService = require('../services/AdminNotificationService');
const BroadcastService = require('../services/BroadcastService');
const I18nService = require('../services/I18nService');

// Планировщики задач
const SchedulerManager = require('../schedulers');

// Импорты обработчиков
const CallbackHandler = require('./listeners/CallbackHandler');
const CommandHandlers = require('./listeners/CommandHandlers');
const PaymentHandlers = require('./listeners/PaymentHandlers');
const MessageHandlers = require('./listeners/MessageHandlers');
const BroadcastCallbacks = require('./handlers/callbacks/BroadcastCallbacks');
const I18nMiddleware = require('../middleware/i18nMiddleware');

// Импорты конфигурации
const config = require('../config');

class TelegramBot {
	constructor() {
		// Инициализируем Telegraf бота
		this.bot = new Telegraf(config.telegram.token, config.telegram.options);
        
		// Инициализируем базу данных и сервисы
		if (config.database.type === 'supabase') {
			console.log('☁️  Используется Supabase (рекомендуется)');
			this.db = new SupabaseDatabase(
				config.database.supabase.url,
				config.database.supabase.apiKey
			);
		} else if (config.database.type === 'postgres') {
			console.log('🐘 Используется PostgreSQL Direct');
			this.db = new PostgresDatabase(config.database.url);
		} else {
			console.log('📁 Используется SQLite');
			this.db = new SQLiteDatabase(config.database.path);
		}
		this.i18nService = new I18nService();
		this.outlineService = new OutlineService(config.outline.apiUrl);
		this.xrayService = new XRayService();
		this.paymentService = new PaymentService(this.db);
		this.keysService = new KeysService(this.db, this.outlineService, this.xrayService);
		this.notificationService = new NotificationService(this.bot, this.i18nService, this.db);
		this.adminNotificationService = new AdminNotificationService(this.bot, this.db);
		this.broadcastService = new BroadcastService(this.bot, this.db);

		// Инициализируем менеджер планировщиков
		this.schedulerManager = new SchedulerManager(
			this.keysService,
			this.adminNotificationService,
			this.broadcastService
		);

		// Инициализируем обработчики рассылок
		this.broadcastCallbacks = new BroadcastCallbacks(this.db, this.broadcastService);

		// Инициализируем обработчики
		this.CallbackHandler = new CallbackHandler(this.db, this.paymentService, this.keysService, this.bot, this.broadcastCallbacks);
		this.commandHandlers = new CommandHandlers(this.db);
		this.paymentHandlers = new PaymentHandlers(
			this.paymentService,
			this.keysService,
			this.db,
			this.adminNotificationService
		);
		this.messageHandlers = new MessageHandlers(this.db, this.bot, this.broadcastCallbacks);

		// Подключаем i18n middleware
		const i18nMiddleware = new I18nMiddleware(this.i18nService, this.db);
		this.bot.use(i18nMiddleware.middleware());

		// Настраиваем обработчики событий и cron задачи
		this.setupHandlers();
		this.setupCronJobs();
        
		// Передаем ссылку на сервис уведомлений в KeysService
		this.keysService.sendNotificationToUser = this.notificationService.sendNotificationToUser.bind(this.notificationService);
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
			await this.CallbackHandler.handleCallback(ctx);
		});

		// Обработка ошибок
		this.bot.catch((err) => {
			console.error('Ошибка бота:', err);
		});
	}


	setupCronJobs() {
		// Запускаем все планировщики
		this.schedulerManager.start();
	}

	async start() {
		try {
			console.log('🤖 VPN Bot запускается...');
            
			await this.bot.launch();
			console.log('✅ VPN Bot успешно запущен!');
            
			// Устанавливаем команды бота
			// await this.bot.telegram.setMyCommands([
			// 	{ command: 'start', description: 'Start working with the bot' },
			// 	{ command: 'help', description: 'Help and information' }
			// ]);
			
			// await this.bot.telegram.setMyCommands([
			// 	{ command: 'start', description: 'Начать работу с ботом' },
			// 	{ command: 'help', description: 'Помощь и информация' }
			// ]);

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
		console.log('🛑 Остановка бота...');
		this.schedulerManager.stop();
		this.bot.stop('SIGINT');
		this.db.close();
		console.log('✅ Бот успешно остановлен');
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

module.exports = TelegramBot;