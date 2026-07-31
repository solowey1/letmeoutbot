const KeysScheduler = require('./KeysScheduler');
const AdminScheduler = require('./AdminScheduler');
const BroadcastScheduler = require('./BroadcastScheduler');

/**
 * Главный менеджер всех планировщиков
 */
class SchedulerManager {
	constructor(keysService, adminNotificationService, broadcastService = null) {
		this.keysScheduler = new KeysScheduler(keysService);
		this.adminScheduler = new AdminScheduler(adminNotificationService);
		this.broadcastScheduler = broadcastService ? new BroadcastScheduler(broadcastService) : null;
	}

	/**
	 * Запустить все планировщики
	 */
	start() {
		console.log('🕐 Запуск всех планировщиков...');
		console.log('');

		this.keysScheduler.start();
		console.log('');

		this.adminScheduler.start();
		console.log('');

		if (this.broadcastScheduler) {
			this.broadcastScheduler.start();
			console.log('');
		}

		console.log('✅ Все планировщики успешно запущены');
	}

	/**
	 * Остановить все планировщики
	 */
	stop() {
		console.log('🛑 Остановка всех планировщиков...');
		console.log('');

		this.keysScheduler.stop();
		console.log('');

		this.adminScheduler.stop();
		console.log('');

		if (this.broadcastScheduler) {
			this.broadcastScheduler.stop();
			console.log('');
		}

		console.log('✅ Все планировщики остановлены');
	}

	/**
	 * Получить статус всех планировщиков
	 * @returns {Object}
	 */
	getStatus() {
		const status = {
			keys: this.keysScheduler.getJobs(),
			admin: this.adminScheduler.getJobs()
		};

		if (this.broadcastScheduler) {
			status.broadcast = this.broadcastScheduler.getJobs();
		}

		return status;
	}

	/**
	 * Запустить задачу вручную
	 * @param {string} scheduler - Название планировщика ('keys' | 'admin' | 'broadcast')
	 * @param {string} taskName - Название задачи
	 */
	async runManually(scheduler, taskName) {
		switch (scheduler) {
			case 'keys':
				await this.keysScheduler.runManually(taskName);
				break;
			case 'admin':
				await this.adminScheduler.runManually(taskName);
				break;
			case 'broadcast':
				if (this.broadcastScheduler) {
					await this.broadcastScheduler.runManually(taskName);
				} else {
					throw new Error('Broadcast scheduler not initialized');
				}
				break;
			default:
				throw new Error(`Неизвестный планировщик: ${scheduler}`);
		}
	}
}

module.exports = SchedulerManager;
