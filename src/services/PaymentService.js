const { PAYMENT_STATUS } = require('../config/constants');

class PaymentService {
	constructor(database) {
		this.db = database;
	}

	async createInvoice(userId, plan) {
		try {
			// Создаем запись о платеже
			const paymentId = await this.db.createPayment(userId, plan.id, plan.price);
            
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

	async getPaymentById(paymentId) {
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

	generateReceiptMessage(payment, plan, keyInfo) {
		const message = `
🧾 <b>Чек об оплате</b>

📋 <b>Детали заказа:</b>
• Тариф: ${plan.name}
• Объем: ${this.formatDataLimit(plan.dataLimit)}
• Период: ${this.formatDuration(plan.duration)}

💰 <b>Платеж:</b>
• Сумма: ${this.formatStarsAmount(payment.amount)}
• Статус: Оплачено ✅
• Дата: ${new Date(payment.created_at).toLocaleString('ru-RU')}

🔑 <b>VPN доступ:</b>
• Статус: Активен
• Действует до: ${new Date(keyInfo.expires_at).toLocaleString('ru-RU')}

Спасибо за покупку! 🎉
        `.trim();

		return message;
	}

	formatDataLimit(bytes) {
		const gb = bytes / (1024 * 1024 * 1024);
		if (gb >= 1024) {
			return `${(gb / 1024).toFixed(0)} ТБ`;
		}
		return `${gb.toFixed(0)} ГБ`;
	}

	formatDuration(days) {
		if (days >= 365) {
			return `${Math.floor(days / 365)} год`;
		} else if (days >= 30) {
			const months = Math.floor(days / 30);
			return `${months} ${months === 6 ? 'месяцев' : 'месяц'}`;
		}
		return `${days} дней`;
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