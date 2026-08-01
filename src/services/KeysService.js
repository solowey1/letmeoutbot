const { KEY_STATUS, KEY_TYPE, NOTIFICATION_TYPES } = require('../config/constants');
const PlanService = require('./PlanService');
const moment = require('moment');

class KeysService {
	constructor(database, xrayService = null, mtprotoService = null) {
		this.db = database;
		this.xrayService = xrayService;
		this.mtprotoService = mtprotoService;
		this.sendNotificationToUser = null; // устанавливается извне
	}

	// ============== СОЗДАНИЕ КЛЮЧЕЙ ==============

	/**
	 * Создать и активировать ключ с retry-логикой.
	 * Возвращает результат активации.
	 */
	async createAndActivateKeyWithRetry(userId, planId, paymentId, userTID, maxRetries = 5) {
		const RETRY_DELAYS = [0, 100, 1000, 5000, 10000];
		const plan = PlanService.getPlanById(planId);
		if (!plan) throw new Error('План не найден');

		const expiresAt = PlanService.calculateExpiryDate(plan);
		const keyId = await this.db.createKey(userId, planId, plan.dataLimit, expiresAt);
		await this.db.updateKey(keyId, { key_type: plan.type });
		await this.db.updatePayment(paymentId, { key_id: keyId });

		let lastError;
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const delay = RETRY_DELAYS[attempt - 1] || 10000;
				if (delay > 0) {
					await new Promise(resolve => setTimeout(resolve, delay));
				}
				console.log(`🔄 Попытка ${attempt}/${maxRetries} создания ключа (key=${keyId})...`);
				const result = await this.activateKeyOnVpnServer(keyId, plan, userTID, expiresAt);
				console.log(`✅ Ключ ${keyId} создан с попытки ${attempt}`);
				return result;
			} catch (error) {
				lastError = error;
				console.error(`❌ Попытка ${attempt}/${maxRetries} не удалась:`, error.message);
			}
		}

		throw new Error(`Не удалось создать ключ после ${maxRetries} попыток: ${lastError.message}`);
	}

	/**
	 * Активировать один ключ на сервере — VLESS + Hysteria2 через подписку,
	 * либо MTProto-прокси, в зависимости от plan.type.
	 * @param {number} keyId - ID записи в БД
	 * @param {object} plan - объект плана
	 * @param {number} userTID - Telegram ID пользователя
	 * @param {Date} expiresAt - дата истечения
	 */
	async activateKeyOnVpnServer(keyId, plan, userTID, expiresAt) {
		const clientId = `LetMeOut_${keyId}_${plan.id}`;

		if (plan.type === KEY_TYPE.MTPROTO) {
			if (!this.mtprotoService) throw new Error('MTProtoService не инициализирован');

			const proxyUser = await this.mtprotoService.createUser(clientId);

			await this.db.updateKey(keyId, {
				external_key_id: proxyUser.secret,
				external_client_id: clientId,
				access_url: proxyUser.accessUrl,
				key_type: KEY_TYPE.MTPROTO,
				status: KEY_STATUS.ACTIVE
			});

			return {
				keyId,
				accessUrl: proxyUser.accessUrl,
				key: await this.db.getKey(keyId)
			};
		}

		if (!this.xrayService) throw new Error('XRayService не инициализирован');

		const expiryTimeMs = expiresAt.getTime();
		const totalGB = plan.dataLimitGB || 0;

		const vlessKey = await this.xrayService.createRealityClient(clientId, totalGB, expiryTimeMs, userTID);

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
			accessUrl: vlessKey.accessUrl,
			key: await this.db.getKey(keyId)
		};
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
		return this.activateKeyOnVpnServer(keyId, plan, user.telegram_id, expiresAt);
	}

	async retryAllPendingActivations() {
		const pending = await this.db.getPendingKeys(50);
		if (!pending.length) return { total: 0, success: 0, failed: 0 };

		let success = 0, failed = 0;
		for (const key of pending) {
			try {
				await this.retryActivateKey(key.id);
				success++;
				console.log(`✅ [PendingRetry] Ключ ${key.id} активирован`);
			} catch (error) {
				failed++;
				console.error(`❌ [PendingRetry] Ключ ${key.id}: ${error.message}`);
			}
		}

		return { total: pending.length, success, failed };
	}

	/**
	 * Перевыпустить ключ старого формата (key_type, отличный от 'vless' —
	 * наследие удалённого Outline) через xray, не давая боту упасть.
	 */
	async reissueLegacyKey(key) {
		if (!this.xrayService) return key;
		try {
			const plan = PlanService.getPlanById(key.plan_id);
			const user = await this.db.getUserById(key.user_id);
			const expiresAt = new Date(key.expires_at);
			const fallbackPlan = { id: key.plan_id, dataLimitGB: key.data_limit ? key.data_limit / (1024 * 1024 * 1024) : 0 };

			const result = await this.activateKeyOnVpnServer(key.id, plan || fallbackPlan, user?.telegram_id, expiresAt);
			return result.key;
		} catch (error) {
			console.error(`⚠️ Не удалось перевыпустить устаревший ключ ${key.id}:`, error.message);
			return key;
		}
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
		let key = await this.db.getKey(keyId);
		if (!key) throw new Error('Ключ не найден');

		const isKnownType = key.key_type === KEY_TYPE.VLESS || key.key_type === KEY_TYPE.MTPROTO;
		if (key.status === KEY_STATUS.ACTIVE && key.key_type && !isKnownType) {
			key = await this.reissueLegacyKey(key);
		}

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

	async getVlessRawKeys(keyId) {
		const key = await this.db.getKey(keyId);
		if (!key || !key.access_url) throw new Error('Ключ не найден');

		const lines = await this.xrayService.getRawClientKeys(key.access_url);
		const result = { vless: [], hysteria2: [] };
		for (const line of lines) {
			if (line.startsWith('vless://')) result.vless.push(line);
			else if (line.startsWith('hy2://') || line.startsWith('hysteria2://')) result.hysteria2.push(line);
		}
		return result;
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

			const formatBytes = this.xrayService
				? this.xrayService.formatBytes.bind(this.xrayService)
				: (b) => `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;

			const calcPercentage = this.xrayService
				? this.xrayService.calculateUsagePercentage.bind(this.xrayService)
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
					: '∞',
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

			if (key.key_type === KEY_TYPE.VLESS && key.external_client_id && this.xrayService) {
				totalUsed = await this.xrayService.getClientDataUsage(key.external_client_id) || 0;
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

			if (key.key_type === KEY_TYPE.VLESS && key.external_key_id && this.xrayService) {
				const dataLimitGB = key.data_limit > 0 ? key.data_limit / (1024 * 1024 * 1024) : 0;
				const expiryTimeMs = new Date(key.expires_at).getTime();
				await this.xrayService.suspendClient(key.external_key_id, key.external_client_id, dataLimitGB, expiryTimeMs);
			}

			if (key.key_type === KEY_TYPE.MTPROTO && key.external_client_id && this.mtprotoService) {
				// У прокси нет мягкой приостановки — секрет удаляется безвозвратно,
				// при повторной покупке будет выдан новый.
				await this.mtprotoService.deleteUser(key.external_client_id);
			}

			// Прокси после удаления секрета восстановить нельзя — помечаем EXPIRED;
			// VLESS приостанавливается (SUSPENDED) и может быть продлён
			const newStatus = key.key_type === KEY_TYPE.MTPROTO
				? KEY_STATUS.EXPIRED
				: KEY_STATUS.SUSPENDED;
			await this.db.updateKey(keyId, { status: newStatus });

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

	// ============== ПОДАРОЧНЫЕ КЛЮЧИ ==============

	async claimGiftKeys(userId, telegramId) {
		const eligible = await this.db.isGiftEligible(telegramId);
		if (!eligible) throw new Error('Подарок уже был получен или пользователь не найден');

		const { PLANS } = require('../config/constants');
		const plan = PLANS.GIFT_VLESS_500MB;

		const expiresAt = PlanService.calculateExpiryDate(plan);
		const keyId = await this.db.createKey(userId, plan.id, plan.dataLimit, expiresAt);
		await this.db.updateKey(keyId, { key_type: KEY_TYPE.VLESS });

		const result = await this.activateKeyOnVpnServer(keyId, plan, telegramId, expiresAt);

		await this.db.markGiftReceived(telegramId);

		return result;
	}
}

module.exports = KeysService;
