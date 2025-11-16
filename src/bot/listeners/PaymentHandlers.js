const KeyboardUtils = require('../../utils/keyboards');
const { PlanMessages } = require('../../services/messages');

class PaymentHandlers {
	constructor(paymentService, keysService) {
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	async handlePreCheckoutQuery(ctx) {
		const t = ctx.i18n?.t || ((key) => key);

		try {
			await ctx.answerPreCheckoutQuery(true);
		} catch (error) {
			console.error('Ошибка пре-чекаута:', error);
			await ctx.answerPreCheckoutQuery(false, t('generic.default', { ns: 'error' }));
		}
	}

	async handleSuccessfulPayment(ctx) {
		console.log('📢 Получен successful_payment от пользователя:', ctx.from.id);

		const payment = ctx.message.successful_payment;
		const payloadData = payment.invoice_payload;

		console.log('💰 Данные платежа:', {
			payload: payloadData,
			telegramChargeId: payment.telegram_payment_charge_id,
			providerChargeId: payment.provider_payment_charge_id,
			totalAmount: payment.total_amount
		});

		// Извлекаем ID платежа из payload
		const paymentId = this.paymentService.extractPaymentIdFromPayload(payloadData);

		if (!paymentId) {
			console.error('❌ Не удалось извлечь ID платежа из payload:', payloadData);
			const t = ctx.i18n?.t || ((key) => key);
			await ctx.reply(t('generic.default', { ns: 'error' }));
			return;
		}

		console.log('🔍 Извлечен ID платежа:', paymentId);

		try {
			console.log('🔄 Обновляем статус платежа...');

			const completedPayment = await this.paymentService.processSuccessfulPayment(
				paymentId,
				payment.telegram_payment_charge_id,
				payment.provider_payment_charge_id
			);

			if (!completedPayment) {
				throw new Error('Платеж не найден');
			}

			console.log('✅ Платеж обновлен:', completedPayment);
			console.log('📝 Создаем ключ...');

			const keyId = await this.keysService.createKey(
				completedPayment.user_id,
				completedPayment.plan_id,
				paymentId
			);

			console.log('✅ Ключ создан с ID:', keyId);
			console.log('🔑 Активируем ключ...');

			const activationResult = await this.keysService.activateKey(
				keyId,
				ctx.from.id
			);

			console.log('✅ Ключ активирован:', activationResult);
			console.log('📤 Отправляем сообщение пользователю...');

			await this.sendAccessKeyMessage(ctx, completedPayment, activationResult);

			console.log('✅ Процесс завершен успешно!');

		} catch (error) {
			console.error('❌ Ошибка активации ключа:', error);
			console.error('❌ Stack trace:', error.stack);

			await this.paymentService.processFailedPayment(paymentId, error.message);

			const t = ctx.i18n?.t || ((key) => key);
			await ctx.reply(PlanMessages.keyActivationError(t, error.message));
		}
	}

	async sendAccessKeyMessage(ctx, payment, activationResult) {
		const { accessUrl } = activationResult;
		const t = ctx.i18n?.t || ((key) => key);

		const message = PlanMessages.paymentSuccess(t, accessUrl);
		const keyboard = KeyboardUtils.createAppsDownloadKeyboard(t);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	// Регистрация обработчиков платежей в боте
	register(bot) {
		bot.on('pre_checkout_query', async (ctx) => {
			await this.handlePreCheckoutQuery(ctx);
		});

		bot.on('successful_payment', async (ctx) => {
			try {
				await this.handleSuccessfulPayment(ctx);
			} catch (error) {
				console.error('Ошибка обработки платежа:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('generic.default', { ns: 'error' }));
			}
		});
	}
}

module.exports = PaymentHandlers;
