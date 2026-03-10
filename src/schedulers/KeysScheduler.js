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

		// Проверка лимитов всех активных ключей (каждые 15 минут)
		const limitsCheckJob = new CronJob('*/15 * * * *', async () => {
			console.log('⏰ [Keys] Проверка лимитов активных ключей...');
			try {
				await this.keysService.checkAllActiveKeys();
			} catch (error) {
				console.error('❌ [Keys] Ошибка проверки лимитов:', error);
			}
		}, null, true);

		this.jobs.push({ name: 'keys_limits_check', job: limitsCheckJob });

		// Глубокий аудит ключей — каждое воскресенье в 03:00.
		// Проверяет все ключи (включая suspended/expired) за последние 30 дней.
		// Когда подписчиков станет больше — измените DEEP_AUDIT_PERIOD_DAYS с 30 на 7,
		// чтобы снизить нагрузку (проверка только за последнюю неделю).
		const DEEP_AUDIT_PERIOD_DAYS = 30;
		const deepAuditJob = new CronJob('0 3 * * 0', async () => {
			console.log(`⏰ [Audit] Еженедельная глубокая проверка ключей за ${DEEP_AUDIT_PERIOD_DAYS} дней...`);
			try {
				await this.keysService.auditKeysByPeriod(DEEP_AUDIT_PERIOD_DAYS);
			} catch (error) {
				console.error('❌ [Audit] Ошибка глубокой проверки:', error);
			}
		}, null, true);

		this.jobs.push({ name: 'keys_deep_audit', job: deepAuditJob });

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
			case 'keys_deep_audit':
				await this.keysService.auditKeysByPeriod(30);
				break;
			default:
				throw new Error(`Неизвестная задача: ${taskName}`);
		}

		console.log(`✅ Задача ${taskName} выполнена`);
	}
}

module.exports = KeysScheduler;
