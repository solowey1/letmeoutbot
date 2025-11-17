const { CronJob } = require('cron');

/**
 * Планировщик задач по проверке и обслуживанию ключей
 */
class KeysScheduler {
	constructor(keysService) {
		this.keysService = keysService;
		this.jobs = [];
	}

	/**
	 * Запустить все задачи
	 */
	start() {
		console.log('🔑 Запуск планировщика задач по ключам...');

		// Проверка лимитов всех активных ключей (каждые 30 минут)
		const limitsCheckJob = new CronJob('*/30 * * * *', async () => {
			console.log('⏰ [Keys] Проверка лимитов активных ключей...');
			try {
				await this.keysService.checkAllActiveKeys();
			} catch (error) {
				console.error('❌ [Keys] Ошибка проверки лимитов:', error);
			}
		}, null, true);

		this.jobs.push({ name: 'keys_limits_check', job: limitsCheckJob });

		console.log(`✅ Запущено ${this.jobs.length} задач по ключам:`);
		this.jobs.forEach(({ name }) => {
			console.log(`  - ${name}`);
		});
	}

	/**
	 * Остановить все задачи
	 */
	stop() {
		console.log('🛑 Остановка планировщика задач по ключам...');
		this.jobs.forEach(({ name, job }) => {
			job.stop();
			console.log(`  ✓ Остановлена задача: ${name}`);
		});
		this.jobs = [];
	}

	/**
	 * Получить список задач
	 * @returns {Array}
	 */
	getJobs() {
		return this.jobs.map(({ name, job }) => ({
			name,
			running: job.running || false
		}));
	}

	/**
	 * Запустить задачу вручную (для тестирования)
	 * @param {string} taskName - Название задачи
	 */
	async runManually(taskName) {
		console.log(`🔧 Ручной запуск задачи: ${taskName}`);

		switch (taskName) {
			case 'keys_limits_check':
				await this.keysService.checkAllActiveKeys();
				break;
			default:
				throw new Error(`Неизвестная задача: ${taskName}`);
		}

		console.log(`✅ Задача ${taskName} выполнена`);
	}
}

module.exports = KeysScheduler;
