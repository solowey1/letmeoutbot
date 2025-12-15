const { CronJob } = require('cron');

/**
 * Планировщик для автоматической обработки запланированных рассылок
 */
class BroadcastScheduler {
	constructor(broadcastService) {
		this.broadcastService = broadcastService;
		this.jobs = [];
	}

	/**
	 * Запустить планировщик
	 */
	start() {
		console.log('📢 Запуск планировщика рассылок...');

		// Проверяем запланированные рассылки каждую минуту
		const scheduledBroadcastsJob = new CronJob('* * * * *', async () => {
			try {
				await this.broadcastService.processScheduledBroadcasts();
			} catch (error) {
				console.error('Ошибка обработки запланированных рассылок:', error);
			}
		}, null, true, 'UTC');

		this.jobs.push({
			name: 'process_scheduled_broadcasts',
			schedule: '* * * * *',
			description: 'Обработка запланированных рассылок',
			job: scheduledBroadcastsJob
		});

		console.log('✅ Запланированные рассылки - каждую минуту');
	}

	/**
	 * Остановить планировщик
	 */
	stop() {
		console.log('🛑 Остановка планировщика рассылок...');

		this.jobs.forEach(({ name, job }) => {
			job.stop();
			console.log(`✅ Остановлена задача: ${name}`);
		});
	}

	/**
	 * Получить список задач
	 * @returns {Array}
	 */
	getJobs() {
		return this.jobs.map(({ name, schedule, description }) => ({
			name,
			schedule,
			description
		}));
	}

	/**
	 * Запустить задачу вручную
	 * @param {string} taskName - Название задачи
	 */
	async runManually(taskName) {
		console.log(`🔄 Запуск задачи вручную: ${taskName}`);

		switch (taskName) {
		case 'process_scheduled_broadcasts':
			await this.broadcastService.processScheduledBroadcasts();
			break;
		default:
			throw new Error(`Неизвестная задача: ${taskName}`);
		}

		console.log(`✅ Задача завершена: ${taskName}`);
	}
}

module.exports = BroadcastScheduler;
