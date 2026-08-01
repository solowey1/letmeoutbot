const { PAYMENT_STATUS } = require('../config/constants');

class PaymentService {
	constructor(database) {
		this.db = database;
	}

	/**
	 * @param {number|null} renewKeyId - если задан, платёж — продление этого ключа:
	 * key_id проставляется сразу, и обработчик оплаты продлит ключ
	 * вместо создания нового (у обычной покупки key_id появляется
	 * только после создания ключа)
	 */
	async createInvoice(userId, plan, renewKeyId = null) {
		try {
			// Создаем запись о платеже
			const paymentId = await this.db.createPayment(userId, plan.id, plan.price);

			if (renewKeyId) {
				await this.db.updatePayment(paymentId, { key_id: renewKeyId });
			}

			// Формируем invoice для Telegram Stars
			const invoice = {
				title: plan.name,
				description: plan.invoice,
				payload: `payment_${paymentId}`,
				provider_token: '', // Для Telegram Stars пустой
				currency: 'XTR', // Telegram Stars
				prices: [
					{
						label: plan.name,
						amount: plan.price // В звёздах
					}
				]
			};

			return {
				paymentId,
				invoice
			};
		} catch (error) {
			console.error('Ошибка создания инвойса:', error);
			throw error;
		}
	}

	async processSuccessfulPayment(paymentId, telegramChargeId, providerChargeId) {
		try {
			const updates = {
				status: PAYMENT_STATUS.COMPLETED,
				telegram_payment_charge_id: telegramChargeId,
				provider_payment_charge_id: providerChargeId
			};

			await this.db.updatePayment(paymentId, updates);
            
			const payment = await this.db.getPayment(paymentId);
			return payment;
		} catch (error) {
			console.error('Ошибка обработки успешного платежа:', error);
			throw error;
		}
	}

	async processFailedPayment(paymentId, reason = 'Unknown error') {
		try {
			const updates = {
				status: PAYMENT_STATUS.FAILED
			};

			await this.db.updatePayment(paymentId, updates);
			console.log(`Платеж ${paymentId} помечен как неуспешный: ${reason}`);
		} catch (error) {
			console.error('Ошибка обработки неуспешного платежа:', error);
			throw error;
		}
	}

	async markPaymentPendingActivation(paymentId, reason = 'Key creation failed') {
		try {
			const updates = {
				status: PAYMENT_STATUS.PENDING_ACTIVATION
			};

			await this.db.updatePayment(paymentId, updates);
			console.log(`⏳ Платеж ${paymentId} помечен как "ожидает активации": ${reason}`);
		} catch (error) {
			console.error('Ошибка пометки платежа как pending_activation:', error);
			throw error;
		}
	}

	async refundPayment(paymentId, reason = 'User refund request') {
		try {
			const updates = {
				status: PAYMENT_STATUS.REFUNDED
			};

			await this.db.updatePayment(paymentId, updates);
			console.log(`Платеж ${paymentId} возвращен: ${reason}`);
            
			return true;
		} catch (error) {
			console.error('Ошибка возврата платежа:', error);
			throw error;
		}
	}

	extractPaymentIdFromPayload(payload) {
		// Извлекаем ID платежа из payload
		const match = payload.match(/payment_(\d+)/);
		return match ? parseInt(match[1]) : null;
	}

	async saveInvoiceMessageId(paymentId, messageId) {
		try {
			await this.db.updatePayment(paymentId, { invoice_message_id: messageId });
			console.log(`💾 Сохранен message_id инвойса: ${messageId} для платежа ${paymentId}`);
		} catch (error) {
			console.error('Ошибка сохранения message_id инвойса:', error);
		}
	}

	async getPayment(paymentId) {
		try {
			return await this.db.getPayment(paymentId);
		} catch (error) {
			console.error('Ошибка получения платежа:', error);
			throw error;
		}
	}

	formatStarsAmount(amount) {
		return `${amount} ⭐`;
	}

	async getPaymentStats() {
		// Здесь можно добавить методы для получения статистики платежей
		// Пока возвращаем заглушку
		return {
			totalPayments: 0,
			totalRevenue: 0,
			successfulPayments: 0,
			failedPayments: 0
		};
	}
}

module.exports = PaymentService;