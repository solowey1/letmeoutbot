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

	// ============== ШАГ 1: выбор типа подключения ==============

	async handleShowPlans(ctx) {
		const t = ctx.i18n.t;
		const message = [
			`🔐 <b>Выберите тип подключения</b>`,
			'',
			`🌿 <b>Outline</b> — простой и надёжный VPN на базе Shadowsocks`,
			`⚡ <b>VLESS</b> — современный протокол, сложнее обнаружить`,
			`👑 <b>Оба протокола</b> — максимальная надёжность со скидкой 20%`
		].join('\n');

		const keyboard = KeyboardUtils.createTypeSelectionKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	// ============== ШАГ 2: выбор тарифа ==============

	async handleShowPlansByType(ctx, type) {
		const t = ctx.i18n.t;
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const plans = PlanService.getPlansByType(type, isAdmin);

		const typeNames = {
			outline: '🌿 Outline VPN',
			vless: '⚡ VLESS',
			both: '👑 Outline + VLESS'
		};

		const typeDescriptions = {
			outline: 'Shadowsocks протокол, работает везде, легко настроить',
			vless: 'Reality протокол, максимальная маскировка трафика',
			both: 'Оба протокола + скидка 20% — переключайтесь в любой момент'
		};

		let message = `<b>${typeNames[type]}</b>\n<i>${typeDescriptions[type]}</i>\n\n`;

		plans.forEach(plan => {
			const formatted = PlanService.formatPlanForDisplay(t, plan);
			const limit = plan.dataLimitGB > 0 ? `${plan.dataLimitGB} GB` : 'Безлимит';
			message += `${plan.emoji} <b>${limit}</b> — ${formatted.displayPrice}/мес\n`;
		});

		const keyboard = KeyboardUtils.createPlansKeyboardByType(t, plans, type);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	// ============== ШАГ 3: детали тарифа ==============

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

		let message = `<b>${formatted.displayName}</b>\n\n`;
		message += `<b>Что включено:</b>\n`;
		message += `• Трафик: ${formatted.displayDataLimit}\n`;
		message += `• Срок: ${formatted.displayDuration}\n`;
		message += `• Безлимитная скорость\n`;
		message += `• Все устройства\n`;

		if (plan.type === 'vless' || plan.type === 'both') {
			message += `• VLESS Reality (сложно заблокировать)\n`;
		}
		if (plan.type === 'outline' || plan.type === 'both') {
			message += `• Outline Shadowsocks\n`;
		}
		if (plan.type === 'both') {
			message += `• Два протокола в одном ключе\n`;
		}

		if (savings > 0) {
			message += `\n💰 Экономия: ${savings} ⭐ vs покупки по отдельности\n`;
		}

		message += `\n<b>Цена: ${formatted.displayPrice}</b>`;
		message += `\n<i>Оплата через Telegram Stars</i>`;

		const keyboard = KeyboardUtils.createPlanDetailsKeyboard(t, planId, plan.type);

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
		const limit = plan.dataLimitGB > 0 ? `${plan.dataLimitGB} GB` : 'Безлимит';

		let message = `🛒 <b>Подтверждение покупки</b>\n\n`;
		message += `${plan.emoji} <b>${plan.name}</b>\n`;
		message += `💾 Трафик: ${limit}\n`;
		message += `⏰ Срок: ${formatted.displayDuration}\n`;
		message += `💰 К оплате: <b>${formatted.displayPrice}</b>\n\n`;
		message += `После оплаты вы мгновенно получите ключ(и) для подключения.\n\n`;
		message += `⭐ Оплата через Telegram Stars`;

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

		try {
			const plan = PlanService.getPlanById(planId);
			if (!plan) throw new Error(t('keys.plan_not_found', { ns: 'error' }));

			const localizedPlan = PlanService.formatPlanForDisplay(t, plan);

			let user = await this.db.getUser(ctx.from.id);
			if (!user) {
				await this.db.createUser(ctx.from.id, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
				user = await this.db.getUser(ctx.from.id);
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
				'✅ Инвойс отправлен! Нажмите «Оплатить» для завершения покупки.',
				KeyboardUtils.createBackToMenuKeyboard(t)
			);

		} catch (error) {
			console.error('Ошибка создания инвойса:', error);
			await ctx.editMessageText(
				`❌ Ошибка: ${error.message}`,
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}
}

module.exports = PlanCallbacks;
