const { CALLBACK_ACTIONS } = require('../config/constants');
const KeyboardUtils = require('../utils/keyboards');

// Импортируем модульные обработчики
const MenuCallbacks = require('./callbacks/MenuCallbacks');
const PlanCallbacks = require('./callbacks/PlanCallbacks');
const SubscriptionCallbacks = require('./callbacks/SubscriptionCallbacks');
const LanguageCallbacks = require('./callbacks/LanguageCallbacks');
const AdminCallbacks = require('./callbacks/AdminCallbacks');

class CallbackHandler {
	constructor(database, paymentService, subscriptionService) {
		this.db = database;
		this.paymentService = paymentService;
		this.subscriptionService = subscriptionService;

		// Инициализируем модульные обработчики
		this.menuCallbacks = new MenuCallbacks(database, paymentService, subscriptionService);
		this.planCallbacks = new PlanCallbacks(database, paymentService, subscriptionService);
		this.subscriptionCallbacks = new SubscriptionCallbacks(database, paymentService, subscriptionService);
		this.languageCallbacks = new LanguageCallbacks(database, paymentService, subscriptionService);
		this.adminCallbacks = new AdminCallbacks(database, paymentService, subscriptionService);
	}

	async handleCallback(ctx) {
		const callbackData = ctx.callbackQuery.data;
		const t = ctx.i18n.t;

		try {
			// Отвечаем на callback запрос чтобы убрать загрузку
			await ctx.answerCbQuery();

			// Роутинг callback'ов к соответствующим модулям
			if (callbackData === CALLBACK_ACTIONS.BACK_TO_MENU) {
				await this.menuCallbacks.handleBackToMenu(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.BUY_PLAN) {
				await this.planCallbacks.handleShowPlans(ctx);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.BUY_PLAN}_`)) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleShowPlanDetails(ctx, planId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.CONFIRM_PURCHASE}_`)) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleConfirmPurchase(ctx, planId);
			} else if (callbackData.startsWith('confirm_payment_')) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleCreateInvoice(ctx, planId);
			} else if (callbackData.startsWith('checkout_')) {
				const planId = callbackData.split('_').slice(1).join('_');
				await this.planCallbacks.handleDirectCheckout(ctx, planId);
			} else if (callbackData === CALLBACK_ACTIONS.MY_KEYS) {
				await this.subscriptionCallbacks.handleMySubscriptions(ctx);
			} else if (callbackData.startsWith('sub_details_')) {
				const subscriptionId = parseInt(callbackData.split('_')[2]);
				await this.subscriptionCallbacks.handleSubscriptionDetails(ctx, subscriptionId);
			} else if (callbackData.startsWith('sub_stats_')) {
				const subscriptionId = parseInt(callbackData.split('_')[2]);
				await this.subscriptionCallbacks.handleSubscriptionStats(ctx, subscriptionId);
			} else if (callbackData === CALLBACK_ACTIONS.SETTINGS) {
				await this.menuCallbacks.handleSettings(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.CHANGE_LANGUAGE) {
				await this.languageCallbacks.handleChangeLanguage(ctx);
			} else if (callbackData.startsWith('set_lang_')) {
				const lang = callbackData.split('_')[2];
				await this.languageCallbacks.handleSetLanguage(ctx, lang);
			} else if (callbackData === 'help') {
				await this.menuCallbacks.handleHelp(ctx);
			} else if (callbackData === 'download_apps') {
				await this.menuCallbacks.handleDownloadApps(ctx);
			} else if (callbackData === 'support') {
				await this.menuCallbacks.handleSupport(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN_PANEL) {
				await this.adminCallbacks.handleAdminPanel(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN_USERS) {
				await this.adminCallbacks.handleAdminUsers(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN_STATS) {
				await this.adminCallbacks.handleAdminStats(ctx);
			} else {
				// Неизвестный callback
				await ctx.editMessageText(t('errors.unknown_command'), KeyboardUtils.createBackToMenuKeyboard(t));
			}
		} catch (error) {
			console.error('Ошибка обработки callback:', error);
			await ctx.answerCbQuery(t('errors.generic'));
		}
	}

}

module.exports = CallbackHandler;