const { ADMIN_IDS } = require('../../../config/constants');
const KeyboardUtils = require('../../../utils/keyboards');
const PlanService = require('../../../services/PlanService');
const { PlanMessages } = require('../../../services/messages');

class PlanCallbacks {
	constructor(database, paymentService, keysService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
	}

	async handleShowPlans(ctx) {
		const t = ctx.i18n.t;
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const plans = PlanService.getAllPlans(isAdmin);
		const keyboard = KeyboardUtils.createPlansKeyboard(t, isAdmin);

		let message = PlanMessages.choosePlan(t) + '\n';

		plans.forEach(plan => {
			const formatted = PlanService.formatPlanForDisplay(t, plan);
			message += `<b>${formatted.displayName}</b>\n`;
			message += `${formatted.fullDescription}\n\n`;
		});

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

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
		const savings = PlanService.calculateSavings(plan);

		const message = PlanMessages.planDetails(t, plan, { ...formatted, savings });
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

		let message = `🛒 <b>${t('payments.confirmation_title', { ns: 'message' })}</b>\n\n`;
		message += `📦 ${t('common.plan')}: ${formatted.displayName}\n`;
		message += `💾 ${t('plans.data_volume', { ns: 'message' })}: ${formatted.dataLimit}\n`;
		message += `⏰ ${t('plans.validity_period', { ns: 'message' })}: ${formatted.duration}\n`;
		message += `💰 ${t('payments.to_pay', { ns: 'message' })}: ${formatted.displayPrice}\n\n`;
		message += `${t('payments.after_payment', { ns: 'message' })}\n\n`;
		message += `⭐ ${t('payments.via_stars', { ns: 'message' })}`;

		const keyboard = KeyboardUtils.createPaymentConfirmationKeyboard(t, planId);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleDirectCheckout(ctx, planId) {
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
		const savings = PlanService.calculateSavings(plan);

		const message = PlanMessages.planDetails(t, plan, { ...formatted, savings });
		const keyboard = KeyboardUtils.createDirectCheckoutKeyboard(t, planId);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleCreateInvoice(ctx, planId) {
		const t = ctx.i18n.t;

		try {
			const plan = PlanService.getPlanById(planId);
			if (!plan) {
				throw new Error(t('keys.plan_not_found', { ns: 'error' }));
			}

			// Получаем или создаем пользователя
			let user = await this.db.getUser(ctx.from.id);
			if (!user) {
				await this.db.createUser(ctx.from.id, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
				user = await this.db.getUser(ctx.from.id);
			}

			// Создаем инвойс
			const { paymentId, invoice } = await this.paymentService.createInvoice(user.id, plan);

			// Отправляем инвойс пользователю
			const invoiceMessage = await ctx.replyWithInvoice({
				title: invoice.title,
				description: invoice.description,
				payload: invoice.payload,
				provider_token: invoice.provider_token,
				currency: invoice.currency,
				prices: invoice.prices,
				photo_url: undefined,
				photo_size: undefined,
				photo_width: undefined,
				photo_height: undefined,
				need_name: false,
				need_phone_number: false,
				need_email: false,
				need_shipping_address: false,
				send_phone_number_to_provider: false,
				send_email_to_provider: false,
				is_flexible: false
			});

			// Сохраняем message_id инвойса для последующего удаления
			await this.paymentService.saveInvoiceMessageId(paymentId, invoiceMessage.message_id);

			const message = PlanMessages.invoiceSent(t);
			await ctx.editMessageText(message, KeyboardUtils.createBackToMenuKeyboard(t));

		} catch (error) {
			console.error('Ошибка создания инвойса:', error);
			const errorMessage = PlanMessages.paymentError(t, error.message);
			await ctx.editMessageText(errorMessage, KeyboardUtils.createBackToMenuKeyboard(t));
		}
	}
}

module.exports = PlanCallbacks;
