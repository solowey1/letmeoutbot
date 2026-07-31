const KeyboardUtils = require('../../../utils/keyboards');
const PlanService = require('../../../services/PlanService');
const config = require('../../../config');

const STAR_CUSTOM_EMOJI_ID = '5920433463428650761';

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

		// Rich Messages (Bot API 10.1): Telegraf 4.x не знает rich_message,
		// поэтому редактируем через callApi напрямую
		try {
			await ctx.telegram.callApi('editMessageText', {
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
