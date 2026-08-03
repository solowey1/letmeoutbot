const { InputFile } = require('grammy');
const moment = require('moment');
const { Markup } = require('../../utils/markup');
const { btn } = require('../../utils/keyboards/common');
const KeyboardUtils = require('../../utils/keyboards');
const { KeyMessages } = require('../../services/messages');
const PlanService = require('../../services/PlanService');
const ReferralService = require('../../services/ReferralService');
const MTProtoService = require('../../services/MTProtoService');
const config = require('../../config');

class PaymentHandlers {
	constructor(paymentService, keysService, database, adminNotificationService = null, settingsService = null) {
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.db = database;
		this.adminNotificationService = adminNotificationService;
		this.settingsService = settingsService;
		this.referralService = new ReferralService(database);
	}

	async handlePreCheckoutQuery(ctx) {
		try {
			const t = ctx.i18n?.t || ((key) => key);

			if (config.maintenanceMode) {
				await ctx.answerPreCheckoutQuery(false, t('payments.maintenance', { ns: 'message' }));
				return;
			}

			// Счёт мог быть выставлен до того, как продажи выключили в админке:
			// это последний рубеж перед списанием Stars.
			if (this.settingsService) {
				const paymentId = this.paymentService.extractPaymentIdFromPayload(ctx.preCheckoutQuery.invoice_payload);
				const payment = paymentId ? await this.paymentService.getPayment(paymentId) : null;
				const plan = payment ? PlanService.getPlanById(payment.plan_id) : null;

				if (plan && (!this.settingsService.isSalesEnabled(plan.type) || plan.disabled)) {
					await ctx.answerPreCheckoutQuery(false, t('payments.sales_disabled', { ns: 'message' }));
					return;
				}
			}

			// Отвечаем сразу — Telegram требует ответ в течение 10 секунд.
			// Если ключ не создастся, handleSuccessfulPayment имеет retry-логику
			// и fallback на pending_activation.
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
					await ctx.api.deleteMessage(ctx.chat.id, completedPayment.invoice_message_id);
					console.log(`🗑️ Удалено сообщение с инвойсом: ${completedPayment.invoice_message_id}`);
				} catch (deleteError) {
					console.warn('⚠️ Не удалось удалить сообщение с инвойсом:', deleteError.message);
				}
			}

			// Продление: у таких платежей key_id проставлен ещё при создании
			// инвойса; у обычной покупки key_id появляется только после
			// создания ключа, т.е. здесь он ещё пуст
			const renewalTarget = completedPayment.key_id
				? await this.db.getKey(completedPayment.key_id)
				: null;
			const isRenewal = !!renewalTarget && renewalTarget.status !== 'pending';

			let result;
			if (isRenewal) {
				console.log(`📝 Продлеваем ключ ${renewalTarget.id} с retry-логикой...`);
				result = await this.keysService.renewKeyWithRetry(
					renewalTarget.id,
					completedPayment.plan_id,
					5
				);
				console.log('✅ Ключ продлён:', result.keyId);
				await this.sendRenewalSuccessMessage(ctx, result);
			} else {
				console.log('📝 Создаем и активируем ключ с retry-логикой...');
				result = await this.keysService.createAndActivateKeyWithRetry(
					completedPayment.user_id,
					completedPayment.plan_id,
					paymentId,
					ctx.from.id,
					5 // максимум 5 попыток с прогрессивной задержкой
				);
				console.log('✅ Ключ создан:', result);
				console.log('📤 Отправляем сообщение пользователю...');
				await this.sendAccessKeyMessage(ctx, result);
			}

			// Начисляем реферальный бонус, если есть реферер.
			// Считаем от фактически уплаченной суммы: у px6 цена динамическая
			// и в шаблоне тарифа её нет, а у остальных она могла измениться
			// в админке уже после выставления счёта.
			try {
				const plan = PlanService.getPlanById(completedPayment.plan_id);
				const paidAmount = Number(completedPayment.amount) || plan?.price || 0;
				const bonusResult = await this.referralService.processReferralBonus(
					completedPayment.user_id,
					paidAmount
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
						result.key,
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

	async sendAccessKeyMessage(ctx, result) {
		const t = ctx.i18n?.t || ((key) => key);

		if (result.key?.key_type === 'mtproto') {
			return this.sendProxyAccessMessage(ctx, result);
		}

		if (result.key?.key_type === 'px6') {
			return this.sendPx6AccessMessage(ctx, result);
		}

		const keyboard = KeyboardUtils.createAppsDownloadKeyboard(t);
		const { generateQR } = require('../../utils/qr');

		let message = `🎉 <b>${t('payments.success_title', { ns: 'message' })}</b>\n\n`;
		message += `✅ ${t('payments.key_activated', { ns: 'message' })}\n\n`;
		message += `🔗 <b>${t('payments.subscription_key_label', { ns: 'message' })}</b>\n<code>${result.accessUrl}</code>\n\n`;
		message += t('payments.add_key_hiddify', { ns: 'message' });

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});

		try {
			const qrBuffer = await generateQR(result.accessUrl);
			await ctx.replyWithPhoto(
				new InputFile(qrBuffer, 'vpn-qr.png'),
				{ caption: t('payments.qr_caption', { ns: 'message' }) }
			);
		} catch (qrError) {
			console.error('⚠️ Не удалось отправить QR-код:', qrError.message);
		}
	}

	async sendRenewalSuccessMessage(ctx, result) {
		const t = ctx.i18n?.t || ((key) => key);
		const key = result.key;
		const dateStr = moment(key.expires_at).format('DD.MM.YYYY');

		let message = `🎉 <b>${t('renewal.success_title', { ns: 'message' })}</b>\n\n`;
		message += `${t('renewal.success_until', { ns: 'message', date: dateStr })}\n\n`;

		if (key.key_type === 'mtproto') {
			const linkChanged = result.previousAccessUrl && result.previousAccessUrl !== result.accessUrl;
			if (linkChanged) {
				message += `${t('renewal.proxy_new_link', { ns: 'message' })}\n🔗 <a href="${key.access_url}">${t('proxy.open_link', { ns: 'message' })}</a>`;
				const manualValues = KeyMessages.proxyManualValues(t, key.access_url);
				if (manualValues) message += `\n\n${manualValues}`;
			} else {
				message += t('renewal.proxy_same', { ns: 'message' });
			}

			const tgLink = MTProtoService.toTgLink(key.access_url);
			const keyboard = KeyboardUtils.createProxyConnectKeyboard(t, tgLink);
			await ctx.reply(message, {
				...keyboard,
				parse_mode: 'HTML',
				disable_web_page_preview: true
			});
			return;
		}

		// px6 продлевает тот же прокси — реквизиты не меняются
		message += key.key_type === 'px6'
			? t('renewal.px6_same', { ns: 'message' })
			: t('renewal.vless_same_key', { ns: 'message' });

		await ctx.reply(message, {
			...Markup.inlineKeyboard([[btn(t, 'my_keys')]]),
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	async sendProxyAccessMessage(ctx, result) {
		const t = ctx.i18n?.t || ((key) => key);
		const tgLink = MTProtoService.toTgLink(result.accessUrl);
		const keyboard = KeyboardUtils.createProxyConnectKeyboard(t, tgLink);

		let message = `🎉 <b>${t('payments.success_title', { ns: 'message' })}</b>\n\n`;
		message += `✅ ${t('proxy.success', { ns: 'message' })}\n\n`;
		message += `🔗 <a href="${result.accessUrl}">${t('proxy.open_link', { ns: 'message' })}</a>\n\n`;
		const manualValues = KeyMessages.proxyManualValues(t, result.accessUrl);
		if (manualValues) message += `${manualValues}\n\n`;
		message += t('proxy.how_to_add.short', { ns: 'message' });

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	/** Выдача купленного у px6 прокси: реквизиты + как подключить */
	async sendPx6AccessMessage(ctx, result) {
		const t = ctx.i18n?.t || ((key) => key);
		const p = result.proxy || {};

		let message = `🎉 <b>${t('payments.success_title', { ns: 'message' })}</b>\n\n`;
		message += `✅ ${t('px6.success', { ns: 'message' })}\n\n`;
		message += `<b>${t('px6.field_host', { ns: 'message' })}:</b> <code>${p.host || ''}</code>\n`;
		message += `<b>${t('px6.field_port', { ns: 'message' })}:</b> <code>${p.port || ''}</code>\n`;
		if (p.user) message += `<b>${t('px6.field_user', { ns: 'message' })}:</b> <code>${p.user}</code>\n`;
		if (p.pass) message += `<b>${t('px6.field_pass', { ns: 'message' })}:</b> <code>${p.pass}</code>\n`;
		if (p.date_end) message += `<b>${t('px6.field_until', { ns: 'message' })}:</b> ${p.date_end}\n`;
		message += `\n<b>${t('px6.field_one_line', { ns: 'message' })}:</b>\n<code>${result.accessUrl}</code>\n\n`;
		message += t('px6.how_to_add.short', { ns: 'message' });

		await ctx.reply(message, {
			...KeyboardUtils.createBackToMenuKeyboard(t),
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	// Регистрация обработчиков платежей в боте
	register(bot) {
		bot.on('pre_checkout_query', async (ctx) => {
			await this.handlePreCheckoutQuery(ctx);
		});

		bot.on('message:successful_payment', async (ctx) => {
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
