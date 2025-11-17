const { CronJob } = require('cron');

/**
 * Планировщик задач для администраторов (уведомления и отчёты)
 */
class AdminScheduler {
	constructor(adminNotificationService) {
		this.adminNotificationService = adminNotificationService;
		this.jobs = [];
	}

	/**
	 * Запустить все задачи
	 */
	start() {
		console.log('👨‍💼 Запуск планировщика задач для администраторов...');

		// Ежедневное уведомление об истекающих завтра ключах (в 20:00 MSK)
		const expiringKeysJob = new CronJob('0 20 * * *', async () => {
			console.log('⏰ [Admin] Проверка ключей, истекающих завтра...');
			try {
				await this.adminNotificationService.notifyExpiringKeysTomorrow();
			} catch (error) {
				console.error('❌ [Admin] Ошибка проверки истекающих ключей:', error);
			}
		}, null, true, 'Europe/Moscow');

		this.jobs.push({ name: 'admin_expiring_keys', job: expiringKeysJob });

		// Еженедельная сводка (каждое воскресенье в 20:20 MSK)
		const weeklySummaryJob = new CronJob('20 20 * * 0', async () => {
			console.log('📊 [Admin] Формирование недельной сводки...');
			try {
				await this.adminNotificationService.sendWeeklySummary();
			} catch (error) {
				console.error('❌ [Admin] Ошибка формирования недельной сводки:', error);
			}
		}, null, true, 'Europe/Moscow');

		this.jobs.push({ name: 'admin_weekly_summary', job: weeklySummaryJob });

		console.log(`✅ Запущено ${this.jobs.length} задач для администраторов:`);
		this.jobs.forEach(({ name }) => {
			console.log(`  - ${name}`);
		});
	}

	/**
	 * Остановить все задачи
	 */
	stop() {
		console.log('🛑 Остановка планировщика задач для администраторов...');
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
			case 'admin_expiring_keys':
				await this.adminNotificationService.notifyExpiringKeysTomorrow();
				break;
			case 'admin_weekly_summary':
				await this.adminNotificationService.sendWeeklySummary();
				break;
			default:
				throw new Error(`Неизвестная задача: ${taskName}`);
		}

		console.log(`✅ Задача ${taskName} выполнена`);
	}
}

module.exports = AdminScheduler;
