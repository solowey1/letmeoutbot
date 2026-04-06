const { KEY_STATUS, KEY_TYPE, NOTIFICATION_TYPES } = require('../config/constants');
const PlanService = require('./PlanService');
const moment = require('moment');

class KeysService {
	constructor(database, outlineService, xrayService = null) {
		this.db = database;
		this.outlineService = outlineService;
		this.xrayService = xrayService;
		this.sendNotificationToUser = null; // устанавливается извне
	}

	// ============== СОЗДАНИЕ КЛЮЧЕЙ ==============

	/**
	 * Создать и активировать ключ(и) с retry-логикой.
	 * Для плана both создаёт два отдельных ключа (outline + vless).
	 * Возвращает массив результатов активации.
	 */
	async createAndActivateKeyWithRetry(userId, planId, paymentId, userTID, maxRetries = 5) {
		const RETRY_DELAYS = [0, 100, 1000, 5000, 10000];
		const plan = PlanService.getPlanById(planId);
		if (!plan) throw new Error('План не найден');

		const protocols = plan.type === 'both'
			? [KEY_TYPE.OUTLINE, KEY_TYPE.VLESS]
			: [plan.type];

		const results = [];

		for (const protocol of protocols) {
			let lastError;
			const expiresAt = PlanService.calculateExpiryDate(plan);
			const keyId = await this.db.createKey(userId, planId, plan.dataLimit, expiresAt);
			await this.db.updateKey(keyId, { key_type: protocol });

			// Привязываем первый ключ к платежу
			if (results.length === 0) {
				await this.db.updatePayment(paymentId, { key_id: keyId });
			}

			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					const delay = RETRY_DELAYS[attempt - 1] || 10000;
					if (delay > 0) {
						await new Promise(resolve => setTimeout(resolve, delay));
					}
					console.log(`🔄 Попытка ${attempt}/${maxRetries} создания ${protocol} ключа (key=${keyId})...`);
					const result = await this.activateKeyOnVpnServer(keyId, plan, protocol, userTID, expiresAt);
					console.log(`✅ ${protocol} ключ ${keyId} создан с попытки ${attempt}`);
					results.push(result);
					lastError = null;
					break;
				} catch (error) {
					lastError = error;
					console.error(`❌ Попытка ${attempt}/${maxRetries} не удалась:`, error.message);
				}
			}

			if (lastError) {
				throw new Error(`Не удалось создать ${protocol} ключ после ${maxRetries} попыток: ${lastError.message}`);
			}
		}

		return results;
	}

	/**
	 * Активировать один ключ на VPN-сервере.
	 * @param {number} keyId - ID записи в БД
	 * @param {object} plan - объект плана
	 * @param {string} protocol - KEY_TYPE.OUTLINE или KEY_TYPE.VLESS
	 * @param {number} userTID - Telegram ID пользователя
	 * @param {Date} expiresAt - дата истечения
	 */
	async activateKeyOnVpnServer(keyId, plan, protocol, userTID, expiresAt) {
		const expiryTimeMs = expiresAt.getTime();
		const clientId = `LetMeOut_${keyId}_${plan.id}`;

		if (protocol === KEY_TYPE.OUTLINE) {
			const outlineKey = await this.outlineService.createKey(
				{ plan_id: plan.id, data_limit: plan.dataLimit },
				userTID
			);

			await this.db.updateKey(keyId, {
				external_key_id: String(outlineKey.keyId),
				external_client_id: clientId,
				access_url: outlineKey.accessUrl,
				key_type: KEY_TYPE.OUTLINE,
				status: KEY_STATUS.ACTIVE
			});

			return {
				keyId,
				protocol: KEY_TYPE.OUTLINE,
				accessUrl: outlineKey.accessUrl,
				key: await this.db.getKey(keyId)
			};
		}

		if (protocol === KEY_TYPE.VLESS) {
			if (!this.xrayService) throw new Error('XRayService не инициализирован');

			const totalGB = plan.dataLimitGB || 0;
			const vlessKey = await this.xrayService.createRealityClient(
				clientId,
				totalGB,
				expiryTimeMs,
				userTID
			);

			await this.db.updateKey(keyId, {
				external_key_id: vlessKey.uuid,
				external_client_id: clientId,
				external_sub_id: vlessKey.subId,
				access_url: vlessKey.accessUrl,
				key_type: KEY_TYPE.VLESS,
				status: KEY_STATUS.ACTIVE
			});

			return {
				keyId,
				protocol: KEY_TYPE.VLESS,
				accessUrl: vlessKey.accessUrl,
				key: await this.db.getKey(keyId)
			};
		}

		throw new Error(`Неизвестный протокол: ${protocol}`);
	}

	/**
	 * Повторная активация pending-ключа (для админки)
	 */
	async retryActivateKey(keyId) {
		const key = await this.db.getKey(keyId);
		if (!key) throw new Error('Ключ не найден');
		if (key.status !== 'pending') throw new Error(`Ключ имеет статус "${key.status}", ожидался "pending"`);

		const plan = PlanService.getPlanById(key.plan_id);
		if (!plan) throw new Error('План не найден');

		const user = await this.db.getUserById(key.user_id);
		if (!user) throw new Error('Пользователь не найден');

		const expiresAt = new Date(key.expires_at);
		// Берём протокол из плана; для both — смотрим key_type, записанный при создании
		const protocol = plan.type === 'both' ? key.key_type : plan.type;
		return this.activateKeyOnVpnServer(keyId, plan, protocol, user.telegram_id, expiresAt);
	}

	// ============== ПОЛУЧЕНИЕ КЛЮЧЕЙ ==============

	async getUserPendingKeys(t, userId) {
		const keys = await this.db.getUserPendingKeys(userId);
		return keys.map(key => {
			const plan = PlanService.getPlanById(key.plan_id);
			return {
				...key,
				plan: plan ? PlanService.formatPlanForDisplay(t, plan) : null
			};
		});
	}

	async getUserActiveKeys(t, userId) {
		const keys = await this.db.getActiveKeys(userId);
		return keys.map(key => {
			const plan = PlanService.getPlanById(key.plan_id);
			return {
				...key,
				plan: plan ? PlanService.formatPlanForDisplay(t, plan) : null
			};
		});
	}

	async getKeyDetails(t, keyId, withUsageStats = true) {
		const key = await this.db.getKey(keyId);
		if (!key) throw new Error('Ключ не найден');

		const plan = PlanService.getPlanById(key.plan_id);
		let usageStats = null;

		if (withUsageStats) {
			usageStats = await this.getUsageStats(keyId);
		}

		return {
			...key,
			plan: plan ? PlanService.formatPlanForDisplay(t, plan) : null,
			usage: usageStats
		};
	}

	async refreshAccessUrl(keyId) {
		const key = await this.db.getKey(keyId);
		if (!key || !key.external_key_id) throw new Error('Ключ не найден или не активирован');

		if (key.key_type === KEY_TYPE.OUTLINE) {
			const outlineKey = await this.outlineService.getAccessKey(key.external_key_id);
			const displayName = `LetMeOut_#${outlineKey.id}_${key.plan_id}`;
			const newAccessUrl = `${outlineKey.accessUrl}#${encodeURIComponent(displayName)}`;
			await this.db.updateKey(keyId, { access_url: newAccessUrl });
			return newAccessUrl;
		}

		// Для VLESS access_url не меняется
		return key.access_url;
	}

	// ============== СТАТИСТИКА ==============

	async getUsageStats(keyId) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) return null;

			const plan = PlanService.getPlanById(key.plan_id);
			if (!plan) return null;

			await this.updateUsageStats(keyId);
			const updatedKey = await this.db.getKey(keyId);

			const formatBytes = this.outlineService
				? this.outlineService.formatBytes.bind(this.outlineService)
				: (b) => `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;

			const calcPercentage = this.outlineService
				? this.outlineService.calculateUsagePercentage.bind(this.outlineService)
				: (used, limit) => limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

			const usagePercentage = updatedKey.data_limit > 0
				? calcPercentage(updatedKey.data_used, updatedKey.data_limit)
				: 0;

			const remainingData = updatedKey.data_limit > 0
				? Math.max(0, updatedKey.data_limit - updatedKey.data_used)
				: null;

			const daysRemaining = moment(updatedKey.expires_at).diff(moment(), 'days');

			return {
				used: updatedKey.data_used,
				limit: updatedKey.data_limit,
				remaining: remainingData,
				usagePercentage,
				daysRemaining: Math.max(0, daysRemaining),
				formattedUsed: formatBytes(updatedKey.data_used),
				formattedLimit: updatedKey.data_limit > 0
					? formatBytes(updatedKey.data_limit)
					: 'Безлимит',
				formattedRemaining: remainingData !== null
					? formatBytes(remainingData)
					: '∞',
				isExpired: moment(updatedKey.expires_at).isBefore(moment()),
				isOverLimit: updatedKey.data_limit > 0 && updatedKey.data_used >= updatedKey.data_limit
			};
		} catch (error) {
			console.error('Ошибка получения статистики:', error);
			return null;
		}
	}

	async updateUsageStats(keyId) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) return false;

			let totalUsed = 0;

			if (key.key_type === KEY_TYPE.OUTLINE && key.external_key_id) {
				const outlineUsage = await this.outlineService.getKeyDataUsage(key.external_key_id);
				totalUsed += outlineUsage || 0;
			}

			if (key.key_type === KEY_TYPE.VLESS && key.external_client_id && this.xrayService) {
				const vlessUsage = await this.xrayService.getClientDataUsage(key.external_client_id);
				totalUsed += vlessUsage || 0;
			}

			if (totalUsed > key.data_used) {
				await this.db.updateKey(keyId, { data_used: totalUsed });
				await this.db.logUsage(keyId, totalUsed - key.data_used);
			}

			return true;
		} catch (error) {
			console.error('Ошибка обновления статистики:', error);
			return false;
		}
	}

	// ============== ПРОВЕРКА ЛИМИТОВ ==============

	async checkLimits(keyId) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key || key.status !== KEY_STATUS.ACTIVE) return false;

			const isExpired = moment(key.expires_at).isBefore(moment());
			const isOverLimit = key.data_limit > 0 && key.data_used >= key.data_limit;

			if (!isExpired && !isOverLimit) return false;

			console.log(`🚫 Блокировка ключа ${keyId}: истёк=${isExpired}, лимит=${isOverLimit}`);

			if (key.key_type === KEY_TYPE.OUTLINE && key.external_key_id) {
				await this.outlineService.suspendKey(key.external_key_id);
			}

			if (key.key_type === KEY_TYPE.VLESS && key.external_key_id && this.xrayService) {
				const dataLimitGB = key.data_limit > 0 ? key.data_limit / (1024 * 1024 * 1024) : 0;
				const expiryTimeMs = new Date(key.expires_at).getTime();
				await this.xrayService.suspendClient(key.external_key_id, key.external_client_id, dataLimitGB, expiryTimeMs);
			}

			await this.db.updateKey(keyId, { status: KEY_STATUS.SUSPENDED });

			if (this.sendNotificationToUser) {
				const user = await this.db.getUserById(key.user_id);
				const notificationType = isExpired
					? NOTIFICATION_TYPES.TIME_EXPIRED
					: NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED;
				const usagePercentage = key.data_limit > 0
					? Math.round((key.data_used / key.data_limit) * 100)
					: 0;
				await this.sendNotificationToUser(user.telegram_id, {
					type: notificationType,
					data: { usagePercentage, daysRemaining: 0 }
				});
			}

			return true;
		} catch (error) {
			console.error('Ошибка проверки лимитов:', error);
			return false;
		}
	}

	async checkAllActiveKeys() {
		try {
			console.log('🔄 Проверка всех активных ключей...');
			const activeKeys = await this.db.getAllActiveKeys();
			console.log(`📊 Найдено ${activeKeys.length} активных ключей`);

			let notificationsSent = 0;
			let keysBlocked = 0;

			for (const key of activeKeys) {
				try {
					await this.updateUsageStats(key.id);
					const updatedKey = await this.db.getKey(key.id);

					const notifications = await this.checkKeyThresholds(updatedKey);
					for (const notification of notifications) {
						const user = await this.db.getUserById(updatedKey.user_id);
						if (this.sendNotificationToUser) {
							await this.sendNotificationToUser(user.telegram_id, notification);
							notificationsSent++;
						}
					}

					const blocked = await this.checkLimits(updatedKey.id);
					if (blocked) keysBlocked++;

				} catch (keyError) {
					console.error(`❌ Ошибка проверки ключа ${key.id}:`, keyError.message);
				}
			}

			console.log(`✅ Проверка завершена: уведомлений ${notificationsSent}, заблокировано ${keysBlocked}`);
			return true;
		} catch (error) {
			console.error('❌ Ошибка массовой проверки:', error);
			return false;
		}
	}

	async auditKeysByPeriod(days = 30) {
		console.log(`🔍 Аудит ключей за ${days} дней...`);
		const keys = await this.db.getKeysByPeriod(days);
		let fixed = 0, errors = 0;

		for (const key of keys) {
			try {
				await this.updateUsageStats(key.id);
				const updatedKey = await this.db.getKey(key.id);

				const isExpired = moment(updatedKey.expires_at).isBefore(moment());
				const isOverLimit = updatedKey.data_limit > 0 && updatedKey.data_used >= updatedKey.data_limit;

				if ((isExpired || isOverLimit) && updatedKey.status === KEY_STATUS.ACTIVE) {
					await this.checkLimits(updatedKey.id);
					fixed++;
				}
			} catch (e) {
				console.error(`❌ Аудит ключа ${key.id}:`, e.message);
				errors++;
			}
		}

		console.log(`✅ Аудит: исправлено ${fixed}, ошибок ${errors}`);
		return { total: keys.length, fixed, errors };
	}

	async checkKeyThresholds(key) {
		const notifications = [];
		const now = moment();
		const daysRemaining = moment(key.expires_at).diff(now, 'days');
		const usagePercentage = key.data_limit > 0
			? (key.data_used / key.data_limit) * 100
			: 0;
		const remainingPercentage = 100 - usagePercentage;

		const checks = [
			{ days: 3, type: NOTIFICATION_TYPES.TIME_WARNING_3, threshold: 3, condition: daysRemaining <= 3 && daysRemaining > 1 },
			{ days: 1, type: NOTIFICATION_TYPES.TIME_WARNING_1, threshold: 1, condition: daysRemaining <= 1 && daysRemaining > 0 },
			{ type: NOTIFICATION_TYPES.TIME_EXPIRED, threshold: 0, condition: moment(key.expires_at).isBefore(now) },
			{ type: NOTIFICATION_TYPES.TRAFFIC_WARNING_5, threshold: 5, condition: key.data_limit > 0 && remainingPercentage <= 5 && remainingPercentage > 1 },
			{ type: NOTIFICATION_TYPES.TRAFFIC_WARNING_1, threshold: 1, condition: key.data_limit > 0 && remainingPercentage <= 1 && remainingPercentage > 0 },
			{ type: NOTIFICATION_TYPES.TRAFFIC_EXHAUSTED, threshold: 100, condition: key.data_limit > 0 && usagePercentage >= 100 }
		];

		for (const check of checks) {
			if (!check.condition) continue;
			const sent = await this.db.checkNotificationSent(key.id, check.type, check.threshold);
			if (!sent) {
				notifications.push({
					type: check.type,
					threshold: check.threshold,
					data: {
						daysRemaining,
						usagePercentage: Math.round(usagePercentage),
						remainingPercentage: Math.round(remainingPercentage)
					}
				});
				await this.db.createNotification(key.id, check.type, check.threshold);
			}
		}

		return notifications;
	}

	async checkOutlineAvailability() {
		try {
			await this.outlineService.getServerInfo();
			return true;
		} catch {
			return false;
		}
	}
}

module.exports = KeysService;
