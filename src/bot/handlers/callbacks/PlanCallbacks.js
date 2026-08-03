const KeyboardUtils = require('../../../utils/keyboards');
const PlanService = require('../../../services/PlanService');
const config = require('../../../config');

const STAR_CUSTOM_EMOJI_ID = '5920433463428650761';

class PlanCallbacks {
	constructor(database, paymentService, keysService, settingsService = null) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.settingsService = settingsService;
	}

	// ============== ШАГ 1: список тарифов ==============

	async handleShowPlans(ctx) {
		const t = ctx.i18n.t;
		const { ADMIN_IDS } = require('../../../config/constants');
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);

		if (this.settingsService && !this.settingsService.isSalesEnabled('vless')) {
			await ctx.editMessageText(
				t('payments.sales_disabled', { ns: 'message' }),
				{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
			);
			return;
		}

		const plans = PlanService.getPlans(isAdmin);

		const keyboard = KeyboardUtils.createPlansKeyboard(t, plans);

		const starEmoji = {
			type: 'custom_emoji',
			custom_emoji_id: STAR_CUSTOM_EMOJI_ID,
			alternative_text: '⭐'
		};

		const headerCells = [
			{
				text: { type: 'bold', text: t('plans.data_volume', { ns: 'message' }) },
				is_header: true, align: 'left', valign: 'middle'
			},
			{
				text: { type: 'bold', text: `${t('plans.price', { ns: 'message' })}${t('plans.per_month', { ns: 'message' })}` },
				is_header: true, align: 'right', valign: 'middle'
			}
		];

		const planRows = plans.map(plan => {
			const limit = plan.dataLimitGB > 0
				? `${plan.dataLimitGB} ${t('common.memory.gb')}`
				: t('plans.unlimited');
			return [
				{ text: limit, align: 'left', valign: 'middle' },
				{ text: [starEmoji, ` ${plan.price}`], align: 'right', valign: 'middle' }
			];
		});

		// Rich Messages (Bot API 10.1): rich_message вместо text
		try {
			await ctx.api.raw.editMessageText({
				chat_id: ctx.chat.id,
				message_id: ctx.callbackQuery.message.message_id,
				rich_message: {
					blocks: [
						{ type: 'paragraph', text: { type: 'bold', text: t('plans.choose', { ns: 'message' }) } },
						{ type: 'table', is_bordered: true, is_striped: true, cells: [headerCells, ...planRows] }
					]
				},
				reply_markup: keyboard.reply_markup
			});
		} catch (error) {
			console.error('Rich message failed, falling back to plain text:', error.message);
			let message = `<b>${t('plans.choose', { ns: 'message' })}</b>\n\n`;
			plans.forEach(plan => {
				const limit = plan.dataLimitGB > 0
					? `${plan.dataLimitGB} ${t('common.memory.gb')}`
					: t('plans.unlimited');
				message += `<b>${limit}</b> — ${plan.price}${t('plans.per_month', { ns: 'message' })}\n`;
			});
			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		}
	}

	// ============== ШАГ 2: детали тарифа ==============

	async handleShowPlanDetails(ctx, planId) {
		const t = ctx.i18n.t;
		const plan = PlanService.getPlanById(planId);

		if (!plan) {
			await ctx.editMessageText(
				t('keys.plan_not_found', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
			return;
		}

		const formatted = PlanService.formatPlanForDisplay(t, plan);

		let message = `<b>${formatted.displayName}</b>\n\n`;
		message += `<b>${t('plans.whats_included', { ns: 'message' })}</b>\n`;
		message += `• ${t('plans.data_volume', { ns: 'message' })}: ${formatted.displayDataLimit}\n`;
		message += `• ${t('plans.validity_period', { ns: 'message' })}: ${formatted.displayDuration}\n`;
		message += `• ${t('plans.unlimited_speed', { ns: 'message' })}\n`;
		message += `• ${t('plans.all_devices', { ns: 'message' })}\n`;
		message += `• ${t('plans.features.reliable', { ns: 'message' })}\n`;

		message += `\n<b>${t('plans.price', { ns: 'message' })}: ${formatted.displayPrice}</b>`;
		message += `\n<i>${t('plans.via_stars', { ns: 'message' })}</i>`;

		const keyboard = KeyboardUtils.createPlanDetailsKeyboard(t, planId);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleConfirmPurchase(ctx, planId) {
		const t = ctx.i18n.t;
		const plan = PlanService.getPlanById(planId);

		if (!plan) {
			await ctx.editMessageText(
				t('keys.plan_not_found', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
			return;
		}

		const formatted = PlanService.formatPlanForDisplay(t, plan);
		const limit = plan.dataLimitGB > 0
			? `${plan.dataLimitGB} ${t('common.memory.gb')}`
			: t('plans.unlimited');

		let message = `🛒 <b>${t('payments.confirmation_title', { ns: 'message' })}</b>\n\n`;
		message += `<b>${formatted.displayName}</b>\n`;
		message += `💾 ${t('plans.data_volume', { ns: 'message' })}: ${limit}\n`;
		message += `⏰ ${t('plans.validity_period', { ns: 'message' })}: ${formatted.displayDuration}\n`;
		message += `💰 ${t('payments.to_pay', { ns: 'message' })}: <b>${formatted.displayPrice}</b>\n\n`;
		message += `${t('payments.after_payment', { ns: 'message' })}\n\n`;
		message += `⭐ ${t('payments.via_stars', { ns: 'message' })}`;

		const keyboard = KeyboardUtils.createPaymentConfirmationKeyboard(t, planId);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleDirectCheckout(ctx, planId) {
		return this.handleShowPlanDetails(ctx, planId);
	}

	// ============== ПРОДЛЕНИЕ КЛЮЧА ==============

	/**
	 * Проверить, что ключ существует и принадлежит пользователю.
	 * @returns {object|null} ключ или null (с сообщением об ошибке)
	 */
	async _getOwnedKey(ctx, keyId) {
		const t = ctx.i18n.t;
		const key = await this.db.getKey(keyId);
		const user = await this.db.getUserByTelegramId(ctx.from.id);

		if (!key || !user || key.user_id !== user.id) {
			await ctx.editMessageText(
				t('keys.renew_not_found', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
			return null;
		}
		return key;
	}

	async handleShowRenewPlans(ctx, keyId) {
		const t = ctx.i18n.t;
		const key = await this._getOwnedKey(ctx, keyId);
		if (!key) return;

		const plans = key.key_type === 'mtproto'
			? PlanService.getProxyPlans()
			: PlanService.getPlans();

		const keyboard = KeyboardUtils.createRenewPlansKeyboard(t, plans, keyId);

		await ctx.editMessageText(
			`<b>${t('renewal.choose_plan', { ns: 'message' })}</b>`,
			{ ...keyboard, parse_mode: 'HTML' }
		);
	}

	async handleCreateRenewInvoice(ctx, keyId, planId) {
		const key = await this._getOwnedKey(ctx, keyId);
		if (!key) return;

		return this.handleCreateInvoice(ctx, planId, keyId);
	}

	async handleCreateInvoice(ctx, planId, renewKeyId = null) {
		const t = ctx.i18n.t;

		if (config.maintenanceMode) {
			await ctx.editMessageText(
				t('payments.maintenance', { ns: 'message' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
			return;
		}

		try {
			const plan = PlanService.getPlanById(planId);
			if (!plan) throw new Error(t('keys.plan_not_found', { ns: 'error' }));

			// Единственная точка выставления счёта — и для покупки, и для
			// продления, поэтому выключатель продаж проверяется здесь.
			if (this.settingsService && !this.settingsService.isSalesEnabled(plan.type)) {
				await ctx.editMessageText(
					t('payments.sales_disabled', { ns: 'message' }),
					KeyboardUtils.createBackToMenuKeyboard(t)
				);
				return;
			}

			if (plan.disabled) {
				await ctx.editMessageText(
					t('payments.plan_unavailable', { ns: 'message' }),
					KeyboardUtils.createBackToMenuKeyboard(t)
				);
				return;
			}

			const localizedPlan = PlanService.formatPlanForDisplay(t, plan);

			let user = await this.db.getUserByTelegramId(ctx.from.id);
			if (!user) {
				await this.db.createUser(ctx.from.id, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
				user = await this.db.getUserByTelegramId(ctx.from.id);
			}

			const { paymentId, invoice } = await this.paymentService.createInvoice(user.id, localizedPlan, renewKeyId);

			const invoiceMessage = await ctx.replyWithInvoice(
				invoice.title,
				invoice.description,
				invoice.payload,
				invoice.currency,
				invoice.prices
			);

			await this.paymentService.saveInvoiceMessageId(paymentId, invoiceMessage.message_id);

			await ctx.editMessageText(
				`✅ ${t('payments.invoice_sent', { ns: 'message' })}`,
				KeyboardUtils.createBackToMenuKeyboard(t)
			);

		} catch (error) {
			console.error('Error creating invoice:', error);
			await ctx.editMessageText(
				t('generic.default', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}
}

module.exports = PlanCallbacks;
