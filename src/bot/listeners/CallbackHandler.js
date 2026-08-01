const { CALLBACK_ACTIONS } = require('../../config/constants');
const KeyboardUtils = require('../../utils/keyboards');

// Импортируем модульные обработчики
const MenuCallbacks = require('../handlers/callbacks/MenuCallbacks');
const PlanCallbacks = require('../handlers/callbacks/PlanCallbacks');
const KeysCallbacks = require('../handlers/callbacks/KeysCallbacks');
const LanguageCallbacks = require('../handlers/callbacks/LanguageCallbacks');
const AdminCallbacks = require('../handlers/callbacks/AdminCallbacks');
const ReferralCallbacks = require('../handlers/callbacks/ReferralCallbacks');
const GiftCallbacks = require('../handlers/callbacks/GiftCallbacks');
const ProxyCallbacks = require('../handlers/callbacks/ProxyCallbacks');

class CallbackHandler {
	constructor(database, paymentService, keysService, bot, broadcastCallbacks = null) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.bot = bot;

		// Инициализируем модульные обработчики
		this.menuCallbacks = new MenuCallbacks(database, paymentService, keysService);
		this.planCallbacks = new PlanCallbacks(database, paymentService, keysService);
		this.KeysCallbacks = new KeysCallbacks(database, paymentService, keysService);
		this.languageCallbacks = new LanguageCallbacks(database, paymentService, keysService);
		this.broadcastCallbacks = broadcastCallbacks;
		this.adminCallbacks = new AdminCallbacks(database, paymentService, keysService, broadcastCallbacks);
		this.referralCallbacks = new ReferralCallbacks(database, bot);
		this.giftCallbacks = new GiftCallbacks(database, keysService);
		this.proxyCallbacks = new ProxyCallbacks(database, paymentService, keysService);
	}

	async handleCallback(ctx) {
		const callbackData = ctx.callbackQuery.data;
		const t = ctx.i18n.t;

		try {
			// Отвечаем на callback запрос чтобы убрать загрузку.
			// Протухший или повторно доставленный query (400 query is too old)
			// не должен срывать обработку нажатия.
			await ctx.answerCallbackQuery().catch(() => {});

			// Роутинг callback'ов к соответствующим модулям
			if (callbackData === CALLBACK_ACTIONS.BASIC.HOME) {
				await this.menuCallbacks.handleBackToMenu(ctx);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.BUY}_`)) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleShowPlanDetails(ctx, planId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.PAYMENT.CONFIRM}_`)) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleConfirmPurchase(ctx, planId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_`)) {
				const planId = callbackData.split('_').slice(2).join('_');
				await this.planCallbacks.handleCreateInvoice(ctx, planId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_`)) {
				const planId = callbackData.split('_').slice(1).join('_');
				await this.planCallbacks.handleDirectCheckout(ctx, planId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.RENEW_PLAN}_`)) {
				// renewplan_<keyId>_<planId>
				const parts = callbackData.split('_');
				const keyId = parseInt(parts[1]);
				const planId = parts.slice(2).join('_');
				await this.planCallbacks.handleCreateRenewInvoice(ctx, keyId, planId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.RENEW}_`)) {
				const keyId = parseInt(callbackData.split('_')[1]);
				await this.planCallbacks.handleShowRenewPlans(ctx, keyId);
			} else if (callbackData === CALLBACK_ACTIONS.KEYS.MENU) {
				await this.KeysCallbacks.handleMyKeys(ctx);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.DETAILS}_`) || callbackData.startsWith('sub_details_')) {
				const keyId = parseInt(callbackData.split('_')[2]);
				await this.KeysCallbacks.handleKeyDetails(ctx, keyId);
			} else if (callbackData.startsWith('sub_stats_')) {
				const keyId = parseInt(callbackData.split('_')[2]);
				await this.KeysCallbacks.handleKeyStats(ctx, keyId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.STATS}_`)) {
				const keyId = parseInt(callbackData.split('_')[2]);
				await this.KeysCallbacks.handleKeyStats(ctx, keyId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.RAW_VLESS}_`)) {
				const keyId = parseInt(callbackData.split('_').pop());
				await this.KeysCallbacks.handleRawVlessKey(ctx, keyId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.KEYS.REFRESH}_`)) {
				const keyId = parseInt(callbackData.split('_').pop());
				await this.KeysCallbacks.handleRefreshKey(ctx, keyId);
			} else if (callbackData === CALLBACK_ACTIONS.SETTINGS.MENU) {
				await this.menuCallbacks.handleSettings(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.SETTINGS.TON_WALLET) {
				await this.menuCallbacks.handleTonWalletSettings(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.SETTINGS.TON_WALLET_INPUT) {
				await this.menuCallbacks.handleTonWalletInput(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.SETTINGS.LANGUAGE.SET) {
				await this.languageCallbacks.handleChangeLanguage(ctx);
			} else if (callbackData.startsWith('set_lang_')) {
				const lang = callbackData.split('_')[2];
				await this.languageCallbacks.handleSetLanguage(ctx, lang);
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HELP) {
				await this.menuCallbacks.handleHelp(ctx);
			// ── Как добавить ключ (howto) ──
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY) {
				await this.menuCallbacks.handleHowToAddKey(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOWTO_APPS) {
				await this.menuCallbacks.handleHowtoVlessChooseOs(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOWTO_VLESS_APPS_LINUX) {
				await this.menuCallbacks.handleHowtoVlessApps(ctx, 'linux');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOWTO_VLESS_APPS_WINDOWS) {
				await this.menuCallbacks.handleHowtoVlessApps(ctx, 'windows');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOWTO_VLESS_APPS_MACOS) {
				await this.menuCallbacks.handleHowtoVlessApps(ctx, 'macos');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOWTO_VLESS_APPS_IOS) {
				await this.menuCallbacks.handleHowtoVlessApps(ctx, 'ios');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOWTO_VLESS_APPS_ANDROID) {
				await this.menuCallbacks.handleHowtoVlessApps(ctx, 'android');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_PROXY) {
				await this.menuCallbacks.handleHowToAddProxy(ctx);
			// ── Приложения для VPN ──
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.VPN_APPS) {
				await this.menuCallbacks.handleVpnApps(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.VLESS_APPS_LINUX) {
				await this.menuCallbacks.handleVlessApps(ctx, 'linux');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.VLESS_APPS_WINDOWS) {
				await this.menuCallbacks.handleVlessApps(ctx, 'windows');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.VLESS_APPS_MACOS) {
				await this.menuCallbacks.handleVlessApps(ctx, 'macos');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.VLESS_APPS_IOS) {
				await this.menuCallbacks.handleVlessApps(ctx, 'ios');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.VLESS_APPS_ANDROID) {
				await this.menuCallbacks.handleVlessApps(ctx, 'android');
			} else if (callbackData === CALLBACK_ACTIONS.BASIC.SUPPORT) {
				await this.menuCallbacks.handleSupport(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.MENU) {
				await this.adminCallbacks.handleAdminPanel(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.USERS.MENU) {
				await this.adminCallbacks.handleAdminUsers(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.STATS.MENU) {
				await this.adminCallbacks.handleAdminStats(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.PAYMENTS.MENU) {
				await this.adminCallbacks.handleAdminPayments(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.KEYS.MENU) {
				await this.adminCallbacks.handleAdminKeys(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.KEYS.PENDING) {
				await this.adminCallbacks.handleAdminPendingKeys(ctx);
			} else if (callbackData.startsWith(CALLBACK_ACTIONS.ADMIN.KEYS.RETRY_ACTIVATE + '_')) {
				const keyId = parseInt(callbackData.split('_').pop());
				await this.adminCallbacks.handleRetryActivateKey(ctx, keyId);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.PENDING) {
				await this.adminCallbacks.handlePendingWithdrawals(ctx);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.VIEW}_`)) {
				const withdrawalId = parseInt(callbackData.split('_').pop());
				await this.adminCallbacks.handleViewWithdrawal(ctx, withdrawalId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.APPROVE}_`)) {
				const withdrawalId = parseInt(callbackData.split('_').pop());
				await this.adminCallbacks.handleApproveWithdrawal(ctx, withdrawalId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.REJECT}_`)) {
				const withdrawalId = parseInt(callbackData.split('_').pop());
				await this.adminCallbacks.handleRejectWithdrawal(ctx, withdrawalId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.MANUAL_PAID}_`)) {
				const withdrawalId = parseInt(callbackData.split('_').pop());
				await this.adminCallbacks.handleManualPaid(ctx, withdrawalId);
			} else if (callbackData.startsWith(`${CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.MANUAL_UNPAID}_`)) {
				const withdrawalId = parseInt(callbackData.split('_').pop());
				await this.adminCallbacks.handleManualUnpaid(ctx, withdrawalId);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.BROADCAST || callbackData === 'admin_broadcast') {
				await this.broadcastCallbacks.handleBroadcastMenu(ctx);
			} else if (callbackData === 'broadcast_new') {
				await this.broadcastCallbacks.handleNewBroadcast(ctx);
			} else if (callbackData === 'broadcast_history') {
				await this.broadcastCallbacks.handleBroadcastHistory(ctx);
			} else if (callbackData.startsWith('broadcast_filter_')) {
				const filterType = callbackData.replace('broadcast_filter_', '');
				await this.broadcastCallbacks.handleFilterSelection(ctx, filterType);
			} else if (callbackData.startsWith('broadcast_lang_')) {
				const lang = callbackData.replace('broadcast_lang_', '');
				await this.broadcastCallbacks.handleLanguageSelection(ctx, lang);
			} else if (callbackData === 'broadcast_confirm_send') {
				await this.broadcastCallbacks.handleConfirmSend(ctx);
			} else if (callbackData === 'broadcast_cancel') {
				await this.broadcastCallbacks.handleCancel(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.ADMIN.SETTINGS) {
				await this.adminCallbacks.handleAdminSettings(ctx);
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
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.HISTORY) {
				await this.referralCallbacks.handleWithdrawalHistory(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.REFERRAL.SET_WALLET) {
				await this.referralCallbacks.handleSetWallet(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.GIFT.INFO) {
				await this.giftCallbacks.handleGiftInfo(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.GIFT.CLAIM) {
				await this.giftCallbacks.handleGiftClaim(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.KEYS.BUY) {
				await this.planCallbacks.handleShowPlans(ctx);
			} else if (callbackData === CALLBACK_ACTIONS.PROXY.MENU) {
				await this.proxyCallbacks.handleProxyMenu(ctx);
			} else {
				// Неизвестный callback
				await ctx.editMessageText(t('generic.unknown_command', { ns: 'error' }), KeyboardUtils.createBackToMenuKeyboard(t));
			}
		} catch (error) {
			console.error(`Ошибка обработки callback [${callbackData}]:`, error.message);
			try {
				await ctx.answerCallbackQuery(t('generic.default', { ns: 'error' }));
			} catch (_) { /* уже отвечено */ }
		}
	}

}

module.exports = CallbackHandler;
