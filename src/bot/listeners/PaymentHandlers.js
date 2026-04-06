const KeyboardUtils = require('../../utils/keyboards');
const { PlanMessages, KeyMessages } = require('../../services/messages');
const PlanService = require('../../services/PlanService');
const ReferralService = require('../../services/ReferralService');

class PaymentHandlers {
	constructor(paymentService, keysService, database, adminNotificationService = null) {
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.db = database;
		this.adminNotificationService = adminNotificationService;
		this.referralService = new ReferralService(database);
	}

	async handlePreCheckoutQuery(ctx) {
		try {
			// Отвечаем сразу — Telegram требует ответ в течение 10 секунд.
			// Проверка Outline API здесь не нужна: если ключ не создастся,
			// handleSuccessfulPayment имеет retry-логику и fallback на pending_activation.
			await ctx.answerPreCheckoutQuery(true);
		} catch (error) {
			console.error('Ошибка пре-чекаута:', error);
			const t = ctx.i18n?.t || ((key) => key);
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

			// Удаляем сообщение с инвойсом, если оно было сохранено
			if (completedPayment.invoice_message_id) {
				try {
					await ctx.telegram.deleteMessage(ctx.chat.id, completedPayment.invoice_message_id);
					console.log(`🗑️ Удалено сообщение с инвойсом: ${completedPayment.invoice_message_id}`);
				} catch (deleteError) {
					console.warn('⚠️ Не удалось удалить сообщение с инвойсом:', deleteError.message);
				}
			}

			console.log('📝 Создаем и активируем ключ с retry-логикой...');

			const results = await this.keysService.createAndActivateKeyWithRetry(
				completedPayment.user_id,
				completedPayment.plan_id,
				paymentId,
				ctx.from.id,
				5 // максимум 5 попыток с прогрессивной задержкой
			);

			console.log(`✅ Создано ключей: ${results.length}`, results);
			console.log('📤 Отправляем сообщение пользователю...');

			await this.sendAccessKeyMessage(ctx, completedPayment, results);

			// Начисляем реферальный бонус, если есть реферер
			try {
				const plan = PlanService.getPlanById(completedPayment.plan_id);
				const bonusResult = await this.referralService.processReferralBonus(
					completedPayment.user_id,
					plan.price
				);

				if (bonusResult) {
					console.log(`💰 Начислен реферальный бонус: ${bonusResult.bonusAmount} ⭐ для пользователя ${bonusResult.referrerId}`);
				}
			} catch (bonusError) {
				console.error('⚠️ Ошибка начисления реферального бонуса:', bonusError.message);
			}

			// Уведомляем администраторов об успешной покупке
			if (this.adminNotificationService) {
				try {
					const user = await this.db.getUserByTelegramId(ctx.from.id);
					const plan = PlanService.getPlanById(completedPayment.plan_id);
					await this.adminNotificationService.notifyNewPurchase(
						completedPayment,
						results[0].key,
						user,
						plan,
						'success'
					);
				} catch (notifyError) {
					console.error('⚠️ Ошибка отправки уведомления админам:', notifyError.message);
				}
			}

			console.log('✅ Процесс завершен успешно!');

		} catch (error) {
			console.error('❌ Ошибка активации ключа:', error);
			console.error('❌ Stack trace:', error.stack);

			// Помечаем платёж как "ожидает активации" вместо "failed"
			// Это позволит фоновой задаче повторить попытку создания ключа
			await this.paymentService.markPaymentPendingActivation(paymentId, error.message);

			// Уведомляем пользователя о проблеме
			const t = ctx.i18n?.t || ((key) => key);
			const errorMsg = KeyMessages.activationPending(t);

			await ctx.reply(errorMsg, { parse_mode: 'HTML' });

			// Уведомляем администраторов об ошибке
			if (this.adminNotificationService) {
				try {
					const completedPayment = await this.paymentService.getPayment(paymentId);
					const user = await this.db.getUserByTelegramId(ctx.from.id);
					const plan = PlanService.getPlanById(completedPayment.plan_id);
					await this.adminNotificationService.notifyNewPurchase(
						completedPayment,
						null,
						user,
						plan,
						'pending',
						error.message
					);
				} catch (notifyError) {
					console.error('⚠️ Ошибка отправки уведомления админам:', notifyError.message);
				}
			}
		}
	}

	async sendAccessKeyMessage(ctx, payment, activationResults) {
		const t = ctx.i18n?.t || ((key) => key);
		const keyboard = KeyboardUtils.createAppsDownloadKeyboard(t);

		let message = `🎉 <b>${t('payments.success_title', { ns: 'message' })}</b>\n\n`;

		const outlineResult = activationResults.find(r => r.protocol === 'outline');
		const vlessResult = activationResults.find(r => r.protocol === 'vless');

		if (outlineResult && vlessResult) {
			message += `✅ ${t('payments.keys_activated', { ns: 'message' })}\n\n`;
			message += `🌿 <b>${t('payments.outline_key_label', { ns: 'message' })}</b>\n<code>${outlineResult.accessUrl}</code>\n\n`;
			message += `⚡ <b>${t('payments.vless_key_label', { ns: 'message' })}</b>\n<code>${vlessResult.accessUrl}</code>\n\n`;
			message += t('payments.add_key_to_app', { ns: 'message' });
		} else if (vlessResult) {
			message += `✅ ${t('payments.vless_key_activated', { ns: 'message' })}\n\n`;
			message += `⚡ <b>${t('payments.connection_key_label', { ns: 'message' })}</b>\n<code>${vlessResult.accessUrl}</code>\n\n`;
			message += t('payments.add_key_hiddify', { ns: 'message' });
		} else if (outlineResult) {
			message += `✅ ${t('payments.key_activated', { ns: 'message' })}\n\n`;
			message += `🌿 <b>${t('payments.connection_key_label', { ns: 'message' })}</b>\n<code>${outlineResult.accessUrl}</code>\n\n`;
			message += t('payments.add_key_outline', { ns: 'message' });
		}

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
