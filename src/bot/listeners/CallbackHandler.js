const { CALLBACK_ACTIONS } = require('../../config/constants');
const KeyboardUtils = require('../../utils/keyboards');

// Импортируем модульные обработчики
const MenuCallbacks = require('../handlers/callbacks/MenuCallbacks');
const PlanCallbacks = require('../handlers/callbacks/PlanCallbacks');
const KeysCallbacks = require('../handlers/callbacks/KeysCallbacks');
const LanguageCallbacks = require('../handlers/callbacks/LanguageCallbacks');
const AdminCallbacks = require('../handlers/callbacks/AdminCallbacks');
const ReferralCallbacks = require('../handlers/callbacks/ReferralCallbacks');

class CallbackHandler {
	constructor(database, paymentService, keysService, bot) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.bot = bot;

		// Инициализируем модульные обработчики
		this.menuCallbacks = new MenuCallbacks(database, paymentService, keysService);
		this.planCallbacks = new PlanCallbacks(database, paymentService, keysService);
		this.KeysCallbacks = new KeysCallbacks(database, paymentService, keysService);
		this.languageCallbacks = new LanguageCallbacks(database, paymentService, keysService);
		this.adminCallbacks = new AdminCallbacks(database, paymentService, keysService);
		this.referralCallbacks = new ReferralCallbacks(database, bot);
	}

	async handleCallback(ctx) {
		const callbackData = ctx.callbackQuery.data;
		const t = ctx.i18n.t;

		try {
			// Отвечаем на callback запрос чтобы убрать загрузку
			await ctx.answerCbQuery();

			// Роутинг callback'ов к соответствующим модулям
			if (callbackData === CALLBACK_ACTIONS.BASIC.BACK_TO_MENU) {
				await this.menuCallbacks.handleBackToMenu(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.KEYS.BUY) {
				await this.planCallbacks.handleShowPlans(ctx);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.BUY}_`)) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleShowPlanDetails(ctx, planId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.PAYMENT.CONFIRM}_`)) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleConfirmPurchase(ctx, planId);
			} else if (callbackData.startsWith('confirm_payment_')) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleCreateInvoice(ctx, planId);
			} else if (callbackData.startsWith('checkout_')) {
				const planId = callbackData.split('_').slice(1).join('_');
				await this.planCallbacks.handleDirectCheckout(ctx, planId);
			} else if (callbackData === CALLBACK_ACTIONS.KEYS.MENU) {
				await this.KeysCallbacks.handleMyKeys(ctx);
			} else if (callbackData.startsWith('key_details_')) {
				const keyId = parseInt(callbackData.split('_')[2]);
				await this.KeysCallbacks.handleKeyDetails(ctx, keyId);
			} else if (callbackData.startsWith('key_stats_')) {
				const keyId = parseInt(callbackData.split('_')[2]);
				await this.KeysCallbacks.handleKeyStats(ctx, keyId);
			} else if (callbackData === CALLBACK_ACTIONS.SETTINGS.MENU) {
				await this.menuCallbacks.handleSettings(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.SETTINGS.LANGUAGE.SET) {
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
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.MENU) {
				await this.adminCallbacks.handleAdminPanel(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.USERS.MENU) {
				await this.adminCallbacks.handleAdminUsers(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.STATS.MENU) {
				await this.adminCallbacks.handleAdminStats(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.KEYS.PENDING) {
				await this.adminCallbacks.handleAdminPendingKeys(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.MENU) {
				await this.referralCallbacks.handleReferralMenu(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.INVITE) {
				await this.referralCallbacks.handleInvite(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.GET_LINK) {
				await this.referralCallbacks.handleGetLink(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.MY_REFERRALS) {
				await this.referralCallbacks.handleMyReferrals(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.WITHDRAW) {
				await this.referralCallbacks.handleWithdraw(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.CONFIRM_WITHDRAW) {
				await this.referralCallbacks.handleConfirmWithdraw(ctx);
			} else {
				// Неизвестный callback
				await ctx.editMessageText(t('generic.unknown_command', { ns: 'error' }), KeyboardUtils.createBackToMenuKeyboard(t));
			}
		} catch (error) {
			console.error('Ошибка обработки callback:', error);
			await ctx.answerCbQuery(t('generic.default', { ns: 'error' }));
		}
	}

}

module.exports = CallbackHandler;