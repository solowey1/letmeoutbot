const KeyboardUtils = require('../../utils/keyboards');

class PaymentHandlers {
	constructor(paymentService, subscriptionService) {
		this.paymentService = paymentService;
		this.subscriptionService = subscriptionService;
	}

	async handlePreCheckoutQuery(ctx) {
		try {
			await ctx.answerPreCheckoutQuery(true);
		} catch (error) {
			console.error('Ошибка пре-чекаута:', error);
			await ctx.answerPreCheckoutQuery(false, 'Произошла ошибка валидации платежа');
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
			await ctx.reply(t('errors.payment_processing'));
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

			const subscriptionId = await this.subscriptionService.createSubscription(
				completedPayment.user_id,
				completedPayment.plan_id,
				paymentId
			);

			console.log('✅ Ключ создан с ID:', subscriptionId);
			console.log('🔑 Активируем ключ...');

			const activationResult = await this.subscriptionService.activateSubscription(
				subscriptionId,
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
			await ctx.reply(t('errors.key_activation', { error: error.message }));
		}
	}

	async sendAccessKeyMessage(ctx, payment, activationResult) {
		const { accessUrl } = activationResult;
		const t = ctx.i18n?.t || ((key) => key);

		let message = '✅ <b>' + t('payment.success_title') + '</b>\n\n';
		message += '🎉 ' + t('payment.key_activated') + '\n\n';
		message += '🔑 <b>' + t('payment.access_key') + ':</b>\n';
		message += `<code>${accessUrl}</code>\n\n`;
		message += '📱 <b>' + t('payment.how_to_connect') + ':</b>\n';
		message += '1. ' + t('payment.step1') + '\n';
		message += '2. ' + t('payment.step2') + '\n';
		message += '3. ' + t('payment.step3') + '\n';
		message += '4. ' + t('payment.step4') + '\n\n';
		message += '📊 ' + t('payment.check_stats');

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
				await ctx.reply(t('errors.payment_processing'));
			}
		});
	}
}

module.exports = PaymentHandlers;
