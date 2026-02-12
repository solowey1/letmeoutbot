/**
 * Сервис для управления рассылками
 */
class BroadcastService {
	constructor(bot, database) {
		this.bot = bot;
		this.db = database;
		this.activeJobs = new Map(); // Хранение активных задач рассылки
	}

	/**
	 * Создать и запустить рассылку
	 * @param {number} adminId - ID администратора
	 * @param {string} messageText - Текст сообщения
	 * @param {string} filterType - Тип фильтра
	 * @param {string} filterValue - Значение фильтра
	 * @param {Date} scheduledAt - Время отложенной отправки
	 */
	async createBroadcast(adminId, messageText, filterType, filterValue = null, scheduledAt = null) {
		// Получаем список получателей
		const recipients = await this.db.getBroadcastRecipients(filterType, filterValue);

		if (recipients.length === 0) {
			throw new Error('No recipients found for this filter');
		}

		// Создаём рассылку в БД
		const broadcastId = await this.db.createBroadcast(
			adminId,
			messageText,
			filterType,
			filterValue,
			scheduledAt
		);

		// Добавляем получателей
		await this.db.addBroadcastRecipients(broadcastId, recipients);

		// Если не отложенная - запускаем сразу
		if (!scheduledAt) {
			await this.startBroadcast(broadcastId);
		}

		return {
			broadcastId,
			recipientsCount: recipients.length,
			isScheduled: !!scheduledAt
		};
	}

	/**
	 * Запустить рассылку
	 * @param {number} broadcastId - ID рассылки
	 */
	async startBroadcast(broadcastId) {
		const broadcast = await this.db.getBroadcastById(broadcastId);

		if (!broadcast) {
			throw new Error('Broadcast not found');
		}

		if (broadcast.status !== 'pending') {
			throw new Error('Broadcast already started or completed');
		}

		// Обновляем статус
		await this.db.updateBroadcastStatus(broadcastId, 'in_progress', {
			started_at: new Date().toISOString()
		});

		// Запускаем асинхронную отправку
		this.executeBroadcast(broadcastId).catch(err => {
			console.error(`Broadcast ${broadcastId} failed:`, err);
		});

		return true;
	}

	/**
	 * Выполнить рассылку (асинхронно)
	 * @param {number} broadcastId - ID рассылки
	 */
	async executeBroadcast(broadcastId) {
		try {
			const broadcast = await this.db.getBroadcastById(broadcastId);

			if (!broadcast) {
				throw new Error('Broadcast not found');
			}

			let hasMore = true;
			const batchSize = 30; // Отправляем по 30 сообщений за раз
			const delayBetweenMessages = 100; // 100мс между сообщениями

			while (hasMore) {
				// Получаем следующую порцию получателей
				const recipients = await this.db.getPendingRecipients(broadcastId, batchSize);

				if (recipients.length === 0) {
					hasMore = false;
					break;
				}

				// Отправляем сообщения
				for (const recipient of recipients) {
					try {
						await this.bot.telegram.sendMessage(
							recipient.telegram_id,
							broadcast.message_text,
							{ parse_mode: 'HTML' }
						);

						// Обновляем статус получателя
						await this.db.updateRecipientStatus(recipient.id, 'sent');

						// Небольшая задержка между сообщениями
						await this.sleep(delayBetweenMessages);
					} catch (error) {
						console.error(`Failed to send to user ${recipient.telegram_id}:`, error.message);

						// Обновляем статус получателя как failed
						await this.db.updateRecipientStatus(
							recipient.id,
							'failed',
							error.message
						);
					}
				}

				// Обновляем счётчики
				await this.db.updateBroadcastCounters(broadcastId);
			}

			// Завершаем рассылку
			await this.db.updateBroadcastStatus(broadcastId, 'completed', {
				completed_at: new Date().toISOString()
			});

			console.log(`✅ Broadcast ${broadcastId} completed successfully`);
		} catch (error) {
			console.error(`❌ Broadcast ${broadcastId} failed:`, error);

			await this.db.updateBroadcastStatus(broadcastId, 'failed', {
				completed_at: new Date().toISOString()
			});
		}
	}

	/**
	 * Проверить и запустить запланированные рассылки
	 */
	async processScheduledBroadcasts() {
		try {
			const broadcasts = await this.db.getScheduledBroadcasts();

			for (const broadcast of broadcasts) {
				console.log(`Starting scheduled broadcast ${broadcast.id}`);
				await this.startBroadcast(broadcast.id);
			}
		} catch (error) {
			console.error('Error processing scheduled broadcasts:', error);
		}
	}

	/**
	 * Отменить рассылку
	 * @param {number} broadcastId - ID рассылки
	 */
	async cancelBroadcast(broadcastId) {
		const broadcast = await this.db.getBroadcastById(broadcastId);

		if (!broadcast) {
			throw new Error('Broadcast not found');
		}

		if (broadcast.status === 'in_progress') {
			throw new Error('Cannot cancel broadcast in progress');
		}

		if (broadcast.status === 'completed') {
			throw new Error('Cannot cancel completed broadcast');
		}

		await this.db.cancelBroadcast(broadcastId);
		return true;
	}

	/**
	 * Получить статус рассылки
	 * @param {number} broadcastId - ID рассылки
	 */
	async getBroadcastStatus(broadcastId) {
		return await this.db.getBroadcastById(broadcastId);
	}

	/**
	 * Получить историю рассылок
	 * @param {number} limit - Лимит
	 */
	async getBroadcastHistory(limit = 20) {
		return await this.db.getBroadcastHistory(limit);
	}

	/**
	 * Вспомогательная функция задержки
	 * @param {number} ms - Миллисекунды
	 */
	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

module.exports = BroadcastService;
