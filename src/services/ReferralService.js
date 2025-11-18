const { REFERRAL_CONFIG } = require('../config/constants');
const moment = require('moment');

class ReferralService {
	constructor(database) {
		this.db = database;
	}

	/**
	 * Создать реферальную связь между пользователями
	 * @param {number} referrerId - ID пользователя-реферера
	 * @param {number} referredId - ID приглашённого пользователя
	 */
	async createReferral(referrerId, referredId) {
		try {
			// Проверяем, что пользователь не приглашает сам себя
			if (referrerId === referredId) {
				return null;
			}

			// Создаём реферальную связь
			await this.db.createReferral(referrerId, referredId);

			// Устанавливаем реферера для пользователя
			await this.db.setUserReferrer(referredId, referrerId);

			return true;
		} catch (error) {
			console.error('Ошибка при создании реферала:', error);
			return null;
		}
	}

	/**
	 * Получить статистику реферальной программы пользователя
	 * @param {number} userId - ID пользователя
	 */
	async getReferralStats(userId) {
		try {
			const stats = await this.db.getReferralStats(userId);
			const referrals = await this.db.getReferrals(userId);

			// Получаем сумму уже выведенных средств
			const totalWithdrawn = await this.db.getTotalWithdrawn(userId);

			// Рассчитываем доступные для вывода средства (с учетом уже выведенных)
			const availableAmount = await this.calculateAvailableForWithdrawal(referrals, totalWithdrawn);
			const pendingAmount = Math.max(0, (stats.total_bonus || 0) - totalWithdrawn - availableAmount);

			return {
				totalReferrals: stats.total_referrals || 0,
				totalEarned: stats.total_bonus || 0,
				totalWithdrawn: totalWithdrawn,
				availableForWithdrawal: availableAmount,
				pendingAmount: pendingAmount,
			};
		} catch (error) {
			console.error('Ошибка при получении статистики рефералов:', error);
			return {
				totalReferrals: 0,
				totalEarned: 0,
				totalWithdrawn: 0,
				availableForWithdrawal: 0,
				pendingAmount: 0,
			};
		}
	}

	/**
	 * Рассчитать доступные для вывода средства
	 * @param {Array} referrals - Список рефералов с бонусами
	 * @param {number} totalWithdrawn - Общая сумма уже выведенных средств
	 */
	async calculateAvailableForWithdrawal(referrals, totalWithdrawn = 0) {
		let totalEligible = 0;
		const now = moment();

		for (const referral of referrals) {
			if (!referral.bonus_earned || referral.bonus_earned <= 0) {
				continue;
			}

			// Если есть дата создания бонуса, проверяем срок
			if (referral.created_at) {
				const referralDate = moment(referral.created_at);
				const daysSinceReferral = now.diff(referralDate, 'days');

				// Бонус доступен для вывода через WITHDRAWAL_DELAY_DAYS дней
				if (daysSinceReferral >= REFERRAL_CONFIG.WITHDRAWAL_DELAY_DAYS) {
					totalEligible += referral.bonus_earned;
				}
			}
		}

		// Вычитаем уже выведенные средства из суммы, доступной для вывода
		const availableAmount = Math.max(0, totalEligible - totalWithdrawn);
		return availableAmount;
	}

	/**
	 * Начислить бонус за реферала
	 * @param {number} userId - ID пользователя, который совершил покупку
	 * @param {number} amount - Сумма покупки
	 */
	async processReferralBonus(userId, amount) {
		try {
			// Получаем информацию о пользователе
			const user = await this.db.getUserById(userId);
			if (!user || !user.referrer_id) {
				return null;
			}

			// Рассчитываем бонус
			const bonusAmount = Math.floor(amount * REFERRAL_CONFIG.COMMISSION_RATE);
			if (bonusAmount <= 0) {
				return null;
			}

			// Начисляем бонус рефереру
			await this.db.updateReferralBonus(
				user.referrer_id,
				userId,
				bonusAmount,
				'purchase'
			);

			return {
				referrerId: user.referrer_id,
				bonusAmount: bonusAmount,
			};
		} catch (error) {
			console.error('Ошибка при начислении реферального бонуса:', error);
			return null;
		}
	}

	/**
	 * Получить список рефералов пользователя
	 * @param {number} userId - ID пользователя
	 * @param {number} limit - Лимит записей
	 */
	async getReferrals(userId, limit = 50) {
		try {
			return await this.db.getReferrals(userId, limit);
		} catch (error) {
			console.error('Ошибка при получении списка рефералов:', error);
			return [];
		}
	}

	/**
	 * Сгенерировать реферальную ссылку для пользователя
	 * @param {string} botUsername - Имя бота
	 * @param {number} userId - ID пользователя
	 */
	static generateReferralLink(botUsername, userId) {
		return `https://t.me/${botUsername}?start=ref_${userId}`;
	}

	/**
	 * Извлечь ID реферера из start параметра
	 * @param {string} startParam - Параметр start
	 */
	static extractReferrerId(startParam) {
		if (!startParam || !startParam.startsWith('ref_')) {
			return null;
		}

		const referrerId = parseInt(startParam.replace('ref_', ''));
		if (isNaN(referrerId)) {
			return null;
		}

		return referrerId;
	}

	/**
	 * Проверить, можно ли вывести средства
	 * @param {number} amount - Сумма для вывода
	 */
	static canWithdraw(amount) {
		return amount >= REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT;
	}

	/**
	 * Форматировать сумму в звездах
	 * @param {number} amount - Сумма
	 */
	static formatAmount(amount) {
		return `${amount} ⭐`;
	}
}

module.exports = ReferralService;
