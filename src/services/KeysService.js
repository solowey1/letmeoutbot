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
	 * Создать и активировать ключ с retry-логикой
	 */
	async createAndActivateKeyWithRetry(userId, planId, paymentId, userTID, maxRetries = 3) {
		let lastError;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`🔄 Попытка ${attempt}/${maxRetries} создания ключа...`);
				const result = await this.createAndActivateKey(userId, planId, paymentId, userTID);
				console.log(`✅ Ключ создан с попытки ${attempt}`);
				return result;
			} catch (error) {
				lastError = error;
				console.error(`❌ Попытка ${attempt}/${maxRetries} не удалась:`, error.message);
				if (attempt < maxRetries) {
					const delay = Math.pow(2, attempt - 1) * 1000;
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		throw new Error(`Не удалось создать ключ после ${maxRetries} попыток: ${lastError.message}`);
	}

	/**
	 * Создать и активировать ключ (одна попытка)
	 */
	async createAndActivateKey(userId, planId, paymentId, userTID) {
		const plan = PlanService.getPlanById(planId);
		if (!plan) throw new Error('План не найден');

		const expiresAt = PlanService.calculateExpiryDate(plan);
		const expiryTimeMs = expiresAt.getTime();

		// Создаём запись в БД
		const keyId = await this.db.createKey(userId, planId, plan.dataLimit, expiresAt);
		await this.db.updatePayment(paymentId, { key_id: keyId });

		let result = { keyId, accessUrl: null, vlessUrl: null };

		// Генерируем уникальный email для 3X-UI
		const xrayEmail = `lmo_${userTID}_${keyId}`;

		if (plan.type === 'outline' || plan.type === 'both') {
			// Создаём Outline ключ
			const outlineKey = await this.outlineService.createKey(
				{ plan_id: planId, data_limit: plan.dataLimit },
				userTID
			);

			await this.db.updateKey(keyId, {
				outline_key_id: outlineKey.keyId,
				access_url: outlineKey.accessUrl,
				key_type: plan.type === 'both' ? 'both' : 'outline',
				xray_email: plan.type === 'both' ? xrayEmail : null,
				status: KEY_STATUS.ACTIVE
			});

			result.accessUrl = outlineKey.accessUrl;
		}

		if (plan.type === 'vless' || plan.type === 'both') {
			// Создаём VLESS Reality ключ
			if (!this.xrayService) throw new Error('XRayService не инициализирован');

			const totalGB = plan.dataLimitGB || 0;
			const vlessKey = await this.xrayService.createClient(
				xrayEmail,
				totalGB,
				expiryTimeMs
			);

			await this.db.updateKey(keyId, {
				key_type: plan.type === 'both' ? 'both' : 'vless_reality',
				xray_email: xrayEmail,
				vless_reality_uuid: vlessKey.uuid,
				vless_reality_url: vlessKey.accessUrl,
				vless_reality_sub_id: vlessKey.subId,
				status: KEY_STATUS.ACTIVE
			});

			result.vlessUrl = vlessKey.accessUrl;

			// Для Outline+VLESS обновляем тип
			if (plan.type === 'both') {
				result.accessUrl = result.accessUrl; // уже установлен выше
			} else {
				result.accessUrl = vlessKey.accessUrl;
			}
		}

		result.key = await this.db.getKey(keyId);
		return result;
	}

	// ============== ПОЛУЧЕНИЕ КЛЮЧЕЙ ==============

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
		if (!key || !key.outline_key_id) throw new Error('Ключ не найден или не активирован');

		const outlineKey = await this.outlineService.getAccessKey(key.outline_key_id);
		const displayName = `LetMeOut_#${outlineKey.id}_${key.plan_id}`;
		const newAccessUrl = `${outlineKey.accessUrl}#${encodeURIComponent(displayName)}`;

		await this.db.updateKey(keyId, { access_url: newAccessUrl });
		return newAccessUrl;
	}

	// ============== СТАТИСТИКА ==============

	async getUsageStats(keyId) {
		try {
			const key = await this.db.getKey(keyId);
			if (!key) return null;

			const plan = PlanService.getPlanById(key.plan_id);
			if (!plan) return null;

			// Обновляем использование
			await this.updateUsageStats(keyId);
			const updatedKey = await this.db.getKey(keyId);

			const usagePercentage = updatedKey.data_limit > 0
				? this.outlineService.calculateUsagePercentage(updatedKey.data_used, updatedKey.data_limit)
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
				formattedUsed: this.outlineService.formatBytes(updatedKey.data_used),
				formattedLimit: updatedKey.data_limit > 0
					? this.outlineService.formatBytes(updatedKey.data_limit)
					: 'Безлимит',
				formattedRemaining: remainingData !== null
					? this.outlineService.formatBytes(remainingData)
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

			// Трафик Outline
			if (key.outline_key_id) {
				const outlineUsage = await this.outlineService.getKeyDataUsage(key.outline_key_id);
				totalUsed += outlineUsage || 0;
			}

			// Трафик VLESS
			if (key.xray_email && this.xrayService) {
				const vlessUsage = await this.xrayService.getClientDataUsage(key.xray_email);
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

			// Блокируем Outline
			if (key.outline_key_id) {
				await this.outlineService.suspendKey(key.outline_key_id);
			}

			// Блокируем VLESS
			if (key.vless_reality_uuid && this.xrayService) {
				await this.xrayService.suspendClient(key.vless_reality_uuid, key.xray_email);
			}

			await this.db.updateKey(keyId, { status: KEY_STATUS.SUSPENDED });

			// Уведомляем пользователя
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
					// Обновляем использование
					await this.updateUsageStats(key.id);
					const updatedKey = await this.db.getKey(key.id);

					// Проверяем пороги уведомлений
					const notifications = await this.checkKeyThresholds(updatedKey);
					for (const notification of notifications) {
						const user = await this.db.getUserById(updatedKey.user_id);
						if (this.sendNotificationToUser) {
							await this.sendNotificationToUser(user.telegram_id, notification);
							notificationsSent++;
						}
					}

					// Проверяем блокировку
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

	// Для обратной совместимости со старым кодом
	async createKey(userId, planId, paymentId) {
		const plan = PlanService.getPlanById(planId);
		if (!plan) throw new Error('План не найден');
		const expiresAt = PlanService.calculateExpiryDate(plan);
		const keyId = await this.db.createKey(userId, planId, plan.dataLimit, expiresAt);
		await this.db.updatePayment(paymentId, { key_id: keyId });
		return keyId;
	}

	async activateKey(keyId, userTID) {
		const key = await this.db.getKey(keyId);
		if (!key) throw new Error('Ключ не найден');
		const keyData = await this.outlineService.createKey(key, userTID);
		await this.db.updateKey(keyId, {
			outline_key_id: keyData.keyId,
			access_url: keyData.accessUrl,
			key_type: 'outline',
			status: KEY_STATUS.ACTIVE
		});
		return { key: await this.db.getKey(keyId), accessUrl: keyData.accessUrl };
	}
}

module.exports = KeysService;
