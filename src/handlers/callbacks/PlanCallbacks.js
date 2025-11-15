const { ADMIN_IDS } = require('../../config/constants');
const KeyboardUtils = require('../../utils/keyboards');
const PlanService = require('../../services/PlanService');

class PlanCallbacks {
	constructor(database, paymentService, subscriptionService) {
		this.db = database;
		this.paymentService = paymentService;
		this.subscriptionService = subscriptionService;
	}

	async handleShowPlans(ctx) {
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const plans = PlanService.getAllPlans(isAdmin);
		const keyboard = KeyboardUtils.createPlansKeyboard(isAdmin);

		let message = '💎 <b>Выберите тарифный план:</b>\n\n';

		plans.forEach(plan => {
			const formatted = PlanService.formatPlanForDisplay(plan);
			message += `<b>${formatted.displayName}</b>\n`;
			message += `${formatted.fullDescription}\n\n`;
		});

		message += '💳 Нажмите на нужный тариф для мгновенной покупки';

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleShowPlanDetails(ctx, planId) {
		const plan = PlanService.getPlanById(planId);
		if (!plan) {
			await ctx.editMessageText('❌ План не найден', KeyboardUtils.createBackToMenuKeyboard());
			return;
		}

		const formatted = PlanService.formatPlanForDisplay(plan);
		const savings = PlanService.calculateSavings(plan);

		let message = `<b>${formatted.displayName}</b>\n\n`;
		message += '📦 Что включено:\n';
		message += `• Объем данных: ${formatted.displayDescription.split(' на ')[0]}\n`;
		message += `• Период действия: ${formatted.displayDescription.split(' на ')[1]}\n`;
		message += '• Безлимитная скорость\n';
		message += '• Поддержка всех устройств\n';
		message += '• Техническая поддержка\n\n';

		if (savings > 0) {
			message += `💰 <i>Экономия: ${savings}</i> ⭐\n\n`;
		}

		message += `💵 <b>Стоимость: ${formatted.displayPrice}</b>\n\n`;
		message += `<i>${plan.description}</i>`;

		const keyboard = KeyboardUtils.createPlanDetailsKeyboard(planId);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleConfirmPurchase(ctx, planId) {
		const plan = PlanService.getPlanById(planId);
		if (!plan) {
			await ctx.editMessageText('❌ План не найден', KeyboardUtils.createBackToMenuKeyboard());
			return;
		}

		const formatted = PlanService.formatPlanForDisplay(plan);

		let message = '🛒 <b>Подтверждение покупки</b>\n\n';
		message += `📦 Тариф: ${formatted.displayName}\n`;
		message += `💾 Объем: ${formatted.displayDescription.split(' на ')[0]}\n`;
		message += `⏰ Период: ${formatted.displayDescription.split(' на ')[1]}\n`;
		message += `💰 К оплате: ${formatted.displayPrice}\n\n`;
		message += 'После оплаты вы мгновенно получите VPN ключ для подключения.\n\n';
		message += '⭐ Оплата происходит через Telegram Stars';

		const keyboard = KeyboardUtils.createPaymentConfirmationKeyboard(planId);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleDirectCheckout(ctx, planId) {
		const plan = PlanService.getPlanById(planId);
		if (!plan) {
			await ctx.editMessageText('❌ План не найден', KeyboardUtils.createBackToMenuKeyboard());
			return;
		}

		const formatted = PlanService.formatPlanForDisplay(plan);
		const savings = PlanService.calculateSavings(plan);

		let message = '💳 <b>Оформление покупки</b>\n\n';
		message = `<b>${formatted.displayName}</b>\n\n`;
		message += '📦 Что включено:\n';
		message += `• Объем данных: ${formatted.displayDescription.split(' на ')[0]}\n`;
		message += `• Период действия: ${formatted.displayDescription.split(' на ')[1]}\n`;
		message += '• Безлимитная скорость\n';
		message += '• Поддержка всех устройств\n';
		message += '• Техническая поддержка\n\n';

		if (savings > 0) {
			message += `💰 <i>Экономия: ${savings}</i> ⭐\n\n`;
		}

		message += `💵 <b>Стоимость: ${formatted.displayPrice}</b>\n\n`;
		message += `<i>${plan.description}</i>\n\n`;
		message += 'После оплаты вы мгновенно получите VPN ключ для подключения.\n\n';
		message += '⭐ Оплата происходит через Telegram Stars';

		const keyboard = KeyboardUtils.createDirectCheckoutKeyboard(planId);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async handleCreateInvoice(ctx, planId) {
		try {
			const plan = PlanService.getPlanById(planId);
			if (!plan) {
				throw new Error('План не найден');
			}

			// Получаем или создаем пользователя
			let user = await this.db.getUser(ctx.from.id);
			if (!user) {
				await this.db.createUser(ctx.from.id, ctx.from.username, ctx.from.first_name, ctx.from.last_name);
				user = await this.db.getUser(ctx.from.id);
			}

			// Создаем инвойс
			const { invoice } = await this.paymentService.createInvoice(user.id, plan);

			// Отправляем инвойс пользователю
			await ctx.replyWithInvoice({
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

			await ctx.editMessageText('💳 Инвойс отправлен! Нажмите "Оплатить" чтобы завершить покупку.',
				KeyboardUtils.createBackToMenuKeyboard());

		} catch (error) {
			console.error('Ошибка создания инвойса:', error);
			await ctx.editMessageText('❌ Ошибка создания платежа. Попробуйте позже.',
				KeyboardUtils.createBackToMenuKeyboard());
		}
	}
}

module.exports = PlanCallbacks;
