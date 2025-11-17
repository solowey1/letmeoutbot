const KeysScheduler = require('./KeysScheduler');
const AdminScheduler = require('./AdminScheduler');

/**
 * Главный менеджер всех планировщиков
 */
class SchedulerManager {
	constructor(keysService, adminNotificationService) {
		this.keysScheduler = new KeysScheduler(keysService);
		this.adminScheduler = new AdminScheduler(adminNotificationService);
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

		console.log('✅ Все планировщики остановлены');
	}

	/**
	 * Получить статус всех планировщиков
	 * @returns {Object}
	 */
	getStatus() {
		return {
			keys: this.keysScheduler.getJobs(),
			admin: this.adminScheduler.getJobs()
		};
	}

	/**
	 * Запустить задачу вручную
	 * @param {string} scheduler - Название планировщика ('keys' | 'admin')
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
			default:
				throw new Error(`Неизвестный планировщик: ${scheduler}`);
		}
	}
}

module.exports = SchedulerManager;
