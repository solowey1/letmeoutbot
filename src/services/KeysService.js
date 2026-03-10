const { KEY_STATUS, NOTIFICATION_TYPES } = require('../config/constants');
const PlanService = require('./PlanService');
const moment = require('moment');

class KeysService {
	constructor(database, outlineService) {
		this.db = database;
		this.outlineService = outlineService;
	}

	async createKey(userId, planId, paymentId) {
		try {
			const plan = PlanService.getPlanById(planId);
			if (!plan) {
				throw new Error('План не найден');
			}

			const expiresAt = PlanService.calculateExpiryDate(plan);

			// Создаем запись ключа в БД
			const keyId = await this.db.createKey(
				userId,
				planId,
				plan.dataLimit,
				expiresAt
			);

			// Обновляем платеж, связав его с ключом
			await this.db.updatePayment(paymentId, {
				key_id: keyId
			});

			return keyId;
		} catch (error) {
			console.error('Ошибка создания ключа:', error);
			throw error;
		}
	}

	async activateKey(keyId, userTID) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) {
				throw new Error('Ключ не найден');
			}

			// Создаем VPN ключ через Outline API
			const keyData = await this.outlineService.createKey(key, userTID);

			// Обновляем ключ с данными от Outline
			await this.db.updateKey(keyId, {
				outline_key_id: keyData.keyId,
				access_url: keyData.accessUrl,
				status: KEY_STATUS.ACTIVE
			});

			return {
				key: await this.db.getKey(keyId),
				accessUrl: keyData.accessUrl
			};
		} catch (error) {
			console.error('Ошибка активации ключа:', error);
			// Помечаем ключ как проблемный
			await this.db.updateKey(keyId, {
				status: KEY_STATUS.SUSPENDED
			});
			throw error;
		}
	}

	async getUserActiveKeys(t, userId) {
		try {
			const keys = await this.db.getActiveKeys(userId);

			// Обогащаем данные информацией о планах
			return keys.map(key => {
				const plan = PlanService.getPlanById(key.plan_id);
				return {
					...key,
					plan: plan ? PlanService.formatPlanForDisplay(t, plan) : null
				};
			});
		} catch (error) {
			console.error('Ошибка получения активных ключей:', error);
			throw error;
		}
	}

	async getKeyDetails(t, keyId, withUsageStats = true) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) {
				throw new Error('Ключ не найден');
			}

			const plan = PlanService.getPlanById(key.plan_id);
			let usageStats = null;

			if (withUsageStats && key.outline_key_id) {
				usageStats = await this.getUsageStats(keyId);
			}

			return {
				...key,
				plan: plan ? PlanService.formatPlanForDisplay(t, plan) : null,
				usage: usageStats
			};
		} catch (error) {
			console.error('Ошибка получения деталей ключа:', error);
			throw error;
		}
	}

	async refreshAccessUrl(keyId) {
		const key = await this.db.getKey(keyId);
		if (!key || !key.outline_key_id) {
			throw new Error('Ключ не найден или не активирован');
		}

		const outlineKey = await this.outlineService.getAccessKey(key.outline_key_id);
		const displayName = `LetMeOut_#${outlineKey.id}_${key.plan_id}`;
		const newAccessUrl = `${outlineKey.accessUrl}#${encodeURIComponent(displayName)}`;

		await this.db.updateKey(keyId, { access_url: newAccessUrl });
		return newAccessUrl;
	}

	async updateUsageStats(keyId) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key || !key.outline_key_id) {
				return false;
			}

			const usageInfo = await this.outlineService.checkAndUpdateUsage(
				key.outline_key_id,
				key.data_used
			);

			if (usageInfo.updated) {
				// Обновляем использование в БД
				await this.db.updateKey(keyId, {
					data_used: usageInfo.newUsage
				});

				// Логируем использование
				if (usageInfo.additionalUsage > 0) {
					await this.db.logUsage(keyId, usageInfo.additionalUsage);
				}

				// Проверяем лимиты
				await this.checkLimits(keyId);
			}

			return usageInfo.updated;
		} catch (error) {
			console.error('Ошибка обновления статистики использования:', error);
			return false;
		}
	}

	async getUsageStats(keyId) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) {
				return null;
			}

			const plan = PlanService.getPlanById(key.plan_id);
			if (!plan) {
				return null;
			}

			// Обновляем актуальную статистику
			await this.updateUsageStats(keyId);

			// Получаем обновленные данные
			const updatedKey = await this.db.getKey(keyId);

			const usagePercentage = this.outlineService.calculateUsagePercentage(
				updatedKey.data_used,
				updatedKey.data_limit
			);

			const remainingData = Math.max(0, updatedKey.data_limit - updatedKey.data_used);
			const daysRemaining = moment(updatedKey.expires_at).diff(moment(), 'days');

			return {
				used: updatedKey.data_used,
				limit: updatedKey.data_limit,
				remaining: remainingData,
				usagePercentage,
				daysRemaining: Math.max(0, daysRemaining),
				formattedUsed: this.outlineService.formatBytes(updatedKey.data_used),
				formattedLimit: this.outlineService.formatBytes(updatedKey.data_limit),
				formattedRemaining: this.outlineService.formatBytes(remainingData),
				isExpired: moment(updatedKey.expires_at).isBefore(moment()),
				isOverLimit: updatedKey.data_used >= updatedKey.data_limit
			};
		} catch (error) {
			console.error('Ошибка получения статистики использования:', error);
			return null;
		}
	}

	async checkLimits(keyId) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key || key.status !== KEY_STATUS.ACTIVE) {
				return false;
			}

			const now = moment();
			const expiryDate = moment(key.expires_at);
			const isExpired = expiryDate.isBefore(now);
			const isOverLimit = key.data_used >= key.data_limit;

			if (isExpired || isOverLimit) {
				console.log(`🚫 Блокировка ключа ${keyId}: истёк=${isExpired}, лимит=${isOverLimit}`);

				// Блокируем ключ
				if (key.outline_key_id) {
					const suspended = await this.outlineService.suspendKey(key.outline_key_id);
					if (!suspended) {
						console.error(`⚠️ Не удалось заблокировать ключ ${keyId} на Outline, повтор при следующей проверке`);
						return false;
					}
				}

				// Обновляем статус ключа только после успешной блокировки на Outline
				await this.db.updateKey(keyId, {
					status: KEY_STATUS.SUSPENDED
				});

				// Отправляем уведомление о блокировке
				if (this.sendNotificationToUser) {
					try {
						const user = await this.db.getUserById(key.user_id);

						const notificationType = isExpired
							? NOTIFICATION_TYPES.TIME_EXPIRED
							: NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED;

						const usagePercentage = Math.round((key.data_used / key.data_limit) * 100);

						await this.sendNotificationToUser(user.telegram_id, {
							type: notificationType,
							data: {
								usagePercentage,
								daysRemaining: 0
							}
						});

						console.log(`📧 Уведомление о блокировке отправлено пользователю ${user.telegram_id}`);
					} catch (notifyError) {
						console.error('⚠️ Ошибка отправки уведомления о блокировке:', notifyError.message);
					}
				}

				return true; // Ключ заблокирован
			}

			return false; // Все в порядке
		} catch (error) {
			console.error('Ошибка проверки лимитов:', error);
			return false;
		}
	}

	async extendKey(keyId, additionalDays, additionalData = 0) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) {
				throw new Error('Ключ не найден');
			}

			const currentExpiry = moment(key.expires_at);
			const newExpiry = currentExpiry.add(additionalDays, 'days').toDate();
			const newDataLimit = key.data_limit + additionalData;

			// Обновляем ключ
			await this.db.updateKey(keyId, {
				expires_at: newExpiry,
				data_limit: newDataLimit,
				status: KEY_STATUS.ACTIVE // Реактивируем если был заблокирован
			});

			// Обновляем лимиты в Outline если есть ключ
			if (key.outline_key_id) {
				await this.outlineService.reactivateKey(key.outline_key_id, newDataLimit);
			}

			return await this.db.getKey(keyId);
		} catch (error) {
			console.error('Ошибка продления ключа:', error);
			throw error;
		}
	}

	async cancelKey(keyId, reason = 'User cancellation') {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) {
				throw new Error('Ключ не найден');
			}

			// Удаляем ключ из Outline
			if (key.outline_key_id) {
				await this.outlineService.deleteAccessKey(key.outline_key_id);
			}

			// Обновляем статус ключа
			await this.db.updateKey(keyId, {
				status: KEY_STATUS.EXPIRED
			});

			console.log(`Ключ ${keyId} отменен: ${reason}`);
			return true;
		} catch (error) {
			console.error('Ошибка отмены ключа:', error);
			throw error;
		}
	}

	async getKeyUsageReport(keyId, days = 30) {
		try {
			// Здесь можно реализовать получение детального отчета об использовании
			// за указанное количество дней
			const key = await this.db.getKey(keyId);
			if (!key) {
				return null;
			}

			// Пока возвращаем базовую информацию
			const usageStats = await this.getUsageStats(keyId);

			return {
				keyId,
				reportPeriod: days,
				currentUsage: usageStats,
				generatedAt: new Date()
			};
		} catch (error) {
			console.error('Ошибка генерации отчета:', error);
			return null;
		}
	}

	// Метод для массовой проверки всех активных ключей (для cron задач)
	async checkAllActiveKeys() {
		try {
			console.log('🔄 Проверка всех активных ключей...');

			const activeKeys = await this.db.getAllActiveKeys();
			console.log(`📊 Найдено ${activeKeys.length} активных ключей`);

			let notificationsSent = 0;
			let keysBlocked = 0;

			for (const key of activeKeys) {
				try {
					// Обновляем статистику использования
					if (key.outline_key_id) {
						const actualUsage = await this.outlineService.getKeyDataUsage(key.outline_key_id);
						if (actualUsage > key.data_used) {
							await this.db.updateKey(key.id, {
								data_used: actualUsage
							});
							key.data_used = actualUsage;
							const usagePercent = ((actualUsage / key.data_limit) * 100).toFixed(1);
							console.log(`📊 Ключ ${key.id}: использовано ${usagePercent}% (${this.formatBytes(actualUsage)} из ${this.formatBytes(key.data_limit)})`);
						}
					}

					// Проверяем пороговые значения и отправляем уведомления
					const notificationsNeeded = await this.checkKeyThresholds(key);

					if (notificationsNeeded.length > 0) {
						console.log(`⚠️ Ключ ${key.id}: требуется ${notificationsNeeded.length} уведомлений`);
						for (const notification of notificationsNeeded) {
							const user = await this.db.getUserById(key.user_id);
							await this.sendNotificationToUser(user.telegram_id, notification);
							notificationsSent++;
						}
					}

					// Проверяем, нужно ли заблокировать ключ
					const shouldBlock = await this.checkLimits(key.id);
					if (shouldBlock) {
						keysBlocked++;
					}

				} catch (keyError) {
					console.error(`❌ Ошибка проверки ключа ${key.id}:`, keyError.message);
				}
			}

			console.log(`✅ Проверка завершена: отправлено ${notificationsSent} уведомлений, заблокировано ${keysBlocked} ключей`);
			return true;

		} catch (error) {
			console.error('❌ Ошибка массовой проверки ключей:', error);
			return false;
		}
	}

	// Проверяет пороговые значения и возвращает необходимые уведомления
	async checkKeyThresholds(key) {
		const notifications = [];
		const now = moment();
		const expiryDate = moment(key.expires_at);
		const daysRemaining = expiryDate.diff(now, 'days');

		const usagePercentage = (key.data_used / key.data_limit) * 100;
		const remainingPercentage = 100 - usagePercentage;

		// Проверяем временные пороги
		if (daysRemaining <= 3 && daysRemaining > 1) {
			const alreadySent = await this.db.checkNotificationSent(
				key.id,
				NOTIFICATION_TYPES.TIME_WARNING_3,
				3
			);
			if (!alreadySent) {
				notifications.push({
					type: NOTIFICATION_TYPES.TIME_WARNING_3,
					threshold: 3,
					data: { daysRemaining, usagePercentage: Math.round(usagePercentage) }
				});
			}
		}

		if (daysRemaining <= 1 && daysRemaining > 0) {
			const alreadySent = await this.db.checkNotificationSent(
				key.id,
				NOTIFICATION_TYPES.TIME_WARNING_1,
				1
			);
			if (!alreadySent) {
				notifications.push({
					type: NOTIFICATION_TYPES.TIME_WARNING_1,
					threshold: 1,
					data: { daysRemaining, usagePercentage: Math.round(usagePercentage) }
				});
			}
		}

		if (expiryDate.isBefore(now)) {
			const alreadySent = await this.db.checkNotificationSent(
				key.id,
				NOTIFICATION_TYPES.TIME_EXPIRED,
				0
			);
			if (!alreadySent) {
				notifications.push({
					type: NOTIFICATION_TYPES.TIME_EXPIRED,
					threshold: 0,
					data: { daysRemaining, usagePercentage: Math.round(usagePercentage) }
				});
			}
		}

		// Проверяем пороги трафика
		if (remainingPercentage <= 5 && remainingPercentage > 1) {
			const alreadySent = await this.db.checkNotificationSent(
				key.id,
				NOTIFICATION_TYPES.TRAFFIC_WARNING_5,
				5
			);
			if (!alreadySent) {
				notifications.push({
					type: NOTIFICATION_TYPES.TRAFFIC_WARNING_5,
					threshold: 5,
					data: { remainingPercentage: Math.round(remainingPercentage), daysRemaining }
				});
			}
		}

		if (remainingPercentage <= 1 && remainingPercentage > 0) {
			const alreadySent = await this.db.checkNotificationSent(
				key.id,
				NOTIFICATION_TYPES.TRAFFIC_WARNING_1,
				1
			);
			if (!alreadySent) {
				notifications.push({
					type: NOTIFICATION_TYPES.TRAFFIC_WARNING_1,
					threshold: 1,
					data: { remainingPercentage: Math.round(remainingPercentage), daysRemaining }
				});
			}
		}

		if (usagePercentage >= 100) {
			const alreadySent = await this.db.checkNotificationSent(
				key.id,
				NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED,
				100
			);
			if (!alreadySent) {
				notifications.push({
					type: NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED,
					threshold: 100,
					data: { usagePercentage: Math.round(usagePercentage), daysRemaining }
				});
			}
		}

		// Записываем отправляемые уведомления в БД
		for (const notification of notifications) {
			await this.db.createNotification(
				key.id,
				notification.type,
				notification.threshold
			);
		}

		return notifications;
	}

	/**
	 * Проверка доступности Outline API
	 * @returns {Promise<boolean>}
	 */
	async checkOutlineAvailability() {
		try {
			await this.outlineService.getServerInfo();
			return true;
		} catch (error) {
			console.error('⚠️ Outline API недоступен:', error.message);
			return false;
		}
	}

	/**
	 * Создание и активация ключа с retry-логикой
	 * @param {number} userId - ID пользователя
	 * @param {string} planId - ID плана
	 * @param {number} paymentId - ID платежа
	 * @param {number} userTID - Telegram ID пользователя
	 * @param {number} maxRetries - Максимальное количество попыток
	 * @returns {Promise<Object>}
	 */
	async createAndActivateKeyWithRetry(userId, planId, paymentId, userTID, maxRetries = 3) {
		let lastError;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`🔄 Попытка ${attempt}/${maxRetries} создания ключа...`);

				// Создаём ключ в БД
				const keyId = await this.createKey(userId, planId, paymentId);

				// Активируем через Outline API
				const activationResult = await this.activateKey(keyId, userTID);

				console.log(`✅ Ключ успешно создан с попытки ${attempt}`);
				return { keyId, ...activationResult };

			} catch (error) {
				lastError = error;
				console.error(`❌ Попытка ${attempt}/${maxRetries} не удалась:`, error.message);

				if (attempt < maxRetries) {
					// Экспоненциальная задержка: 1s, 2s, 4s
					const delay = Math.pow(2, attempt - 1) * 1000;
					console.log(`⏳ Ожидание ${delay}ms перед следующей попыткой...`);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		// Все попытки исчерпаны
		throw new Error(`Не удалось создать ключ после ${maxRetries} попыток: ${lastError.message}`);
	}
}

module.exports = KeysService;
