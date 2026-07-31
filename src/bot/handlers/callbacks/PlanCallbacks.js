const KeyboardUtils = require('../../../utils/keyboards');
const PlanService = require('../../../services/PlanService');
const config = require('../../../config');

class PlanCallbacks {
	constructor(database, paymentService, keysService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	// ============== ШАГ 1: список тарифов ==============

	async handleShowPlans(ctx) {
		const t = ctx.i18n.t;
		const { ADMIN_IDS } = require('../../../config/constants');
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const plans = PlanService.getPlans(isAdmin);

		let message = `<b>${t('plans.choose', { ns: 'message' })}</b>\n\n`;

		plans.forEach(plan => {
			const formatted = PlanService.formatPlanForDisplay(t, plan);
			const limit = plan.dataLimitGB > 0
				? `${plan.dataLimitGB} ${t('common.memory.gb')}`
				: t('plans.unlimited');
			message += `${plan.emoji} <b>${limit}</b> — ${formatted.displayPrice}${t('plans.per_month', { ns: 'message' })}\n`;
		});

		const keyboard = KeyboardUtils.createPlansKeyboard(t, plans);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
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

	async handleCreateInvoice(ctx, planId) {
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

			const localizedPlan = PlanService.formatPlanForDisplay(t, plan);

			let user = await this.db.getUserByTelegramId(ctx.from.id);
			if (!user) {
				await this.db.createUser(ctx.from.id, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
				user = await this.db.getUserByTelegramId(ctx.from.id);
			}

			const { paymentId, invoice } = await this.paymentService.createInvoice(user.id, localizedPlan);

			const invoiceMessage = await ctx.replyWithInvoice({
				title: invoice.title,
				description: invoice.description,
				payload: invoice.payload,
				provider_token: invoice.provider_token,
				currency: invoice.currency,
				prices: invoice.prices,
				need_name: false,
				need_phone_number: false,
				need_email: false,
				need_shipping_address: false,
				is_flexible: false
			});

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
