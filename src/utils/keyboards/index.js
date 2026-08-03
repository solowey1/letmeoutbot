const common = require('./common');
const menu = require('./menu');
const payments = require('./payments');
const keysKb = require('./keys');
const help = require('./help');
const protocols = require('./protocols');
const settings = require('./settings');
const admin = require('./admin');
const broadcast = require('./broadcast');
const referrals = require('./referrals');
const proxy = require('./proxy');
const px6 = require('./px6');

/**
 * KeyboardUtils — фасад, объединяющий все клавиатуры.
 *
 * Модули лежат в keyboards/:
 *   common     — btn(), removeKeyboard(), createBackToMenuKeyboard, ошибки, пагинация
 *   menu       — главное меню
 *   payments   — тарифы, оплата
 *   keys       — мои ключи, детали, статистика
 *   help       — помощь, поддержка
 *   protocols  — приложения, добавление ключей (VLESS + Hysteria2)
 *   settings   — настройки, язык
 *   admin      — админ-панель
 *   broadcast  — рассылки
 *   referrals  — реферальная программа
 *   proxy      — тарифы на MTProto-прокси
 */
class KeyboardUtils {
	// common
	static btn(t, preset, action) { return common.btn(t, preset, action); }
	static removeKeyboard() { return common.removeKeyboard(); }
	static createBackToMenuKeyboard(t) { return common.createBackToMenuKeyboard(t); }
	static createErrorKeyboard(t, backAction) { return common.createErrorKeyboard(t, backAction); }
	static createPaginatedKeyboard(t, items, currentPage, itemsPerPage, callbackPrefix, backAction) {
		return common.createPaginatedKeyboard(t, items, currentPage, itemsPerPage, callbackPrefix, backAction);
	}

	// menu
	static createMainMenu(t, isAdmin, showGift) { return menu.createMainMenu(t, isAdmin, showGift); }

	// payments
	static createPlansKeyboard(t, plans) { return payments.createPlansKeyboard(t, plans); }
	static createRenewPlansKeyboard(t, plans, keyId) { return payments.createRenewPlansKeyboard(t, plans, keyId); }
	static createPlanDetailsKeyboard(t, planId) { return payments.createPlanDetailsKeyboard(t, planId); }
	static createPaymentConfirmationKeyboard(t, planId) { return payments.createPaymentConfirmationKeyboard(t, planId); }
	static createAppsDownloadKeyboard(t) { return payments.createAppsDownloadKeyboard(t); }

	// keys
	static createKeysKeyboard(t, keys) { return keysKb.createKeysKeyboard(t, keys); }
	static createKeyDetailsKeyboard(t, keyId, keyType) { return keysKb.createKeyDetailsKeyboard(t, keyId, keyType); }
	static createKeyStatsKeyboard(t, keyId) { return keysKb.createKeyStatsKeyboard(t, keyId); }

	// help
	static createHelpKeyboard(t) { return help.createHelpKeyboard(t); }
	static createSupportKeyboard(t) { return help.createSupportKeyboard(t); }
	static createHowToAddProxyKeyboard(t) { return help.createHowToAddProxyKeyboard(t); }

	// protocols — путь "Как добавить ключ"
	static createHowToAddKeyKeyboard(t) { return protocols.createHowToAddKeyKeyboard(t); }
	static createHowtoVlessOsKeyboard(t) { return protocols.createHowtoVlessOsKeyboard(t); }
	static createHowtoVlessAppsBackKeyboard(t) { return protocols.createHowtoVlessAppsBackKeyboard(t); }
	// protocols — путь "Приложения для VPN"
	static createVlessOsKeyboard(t) { return protocols.createVlessOsKeyboard(t); }
	static createVlessAppsBackKeyboard(t) { return protocols.createVlessAppsBackKeyboard(t); }

	// settings
	static createSettingsKeyboard(t) { return settings.createSettingsKeyboard(t); }
	static createLanguageKeyboard(t) { return settings.createLanguageKeyboard(t); }
	static createTonWalletKeyboard(t, walletConnected) { return settings.createTonWalletKeyboard(t, walletConnected); }

	// admin
	static createAdminKeyboard(t) { return admin.createAdminKeyboard(t); }
	static createWithdrawalAdminKeyboard(t, withdrawalId) { return admin.createWithdrawalAdminKeyboard(t, withdrawalId); }
	static createWithdrawalManualConfirmKeyboard(t, withdrawalId) { return admin.createWithdrawalManualConfirmKeyboard(t, withdrawalId); }
	static createWithdrawalListKeyboard(t, withdrawals) { return admin.createWithdrawalListKeyboard(t, withdrawals); }
	static createAdminSettingsKeyboard(t, state) { return admin.createAdminSettingsKeyboard(t, state); }
	static createAdminPlanListKeyboard(t, plans) { return admin.createAdminPlanListKeyboard(t, plans); }
	static createAdminPlanKeyboard(t, plan) { return admin.createAdminPlanKeyboard(t, plan); }
	static createAdminPlanCancelKeyboard(t, planId) { return admin.createAdminPlanCancelKeyboard(t, planId); }
	static createAdminPx6Keyboard(t) { return admin.createAdminPx6Keyboard(t); }

	// broadcast
	static createBroadcastAudienceKeyboard(t) { return broadcast.createBroadcastAudienceKeyboard(t); }
	static createBroadcastMenuKeyboard(t) { return broadcast.createBroadcastMenuKeyboard(t); }
	static createBroadcastFilterKeyboard(t) { return broadcast.createBroadcastFilterKeyboard(t); }
	static createBroadcastCancelKeyboard(t) { return broadcast.createBroadcastCancelKeyboard(t); }
	static createBroadcastLanguageKeyboard(t) { return broadcast.createBroadcastLanguageKeyboard(t); }
	static createBroadcastConfirmKeyboard(t) { return broadcast.createBroadcastConfirmKeyboard(t); }
	static createBroadcastHistoryKeyboard(t) { return broadcast.createBroadcastHistoryKeyboard(t); }

	// referrals
	static createReferralMenuKeyboard(t, shareText) { return referrals.createReferralMenuKeyboard(t, shareText); }
	static createReferralInviteKeyboard(t, shareText) { return referrals.createReferralInviteKeyboard(t, shareText); }
	static createReferralBackKeyboard(t) { return referrals.createReferralBackKeyboard(t); }
	static createWithdrawalConfirmKeyboard(t, amount) { return referrals.createWithdrawalConfirmKeyboard(t, amount); }

	// proxy
	static createProxyPlansKeyboard(t, plans) { return proxy.createProxyPlansKeyboard(t, plans); }

	// px6
	static createPx6VersionKeyboard(t) { return px6.createPx6VersionKeyboard(t); }
	static createPx6CountryKeyboard(t, version, countries) { return px6.createPx6CountryKeyboard(t, version, countries); }
	static createPx6PeriodKeyboard(t, version, country, quotes) { return px6.createPx6PeriodKeyboard(t, version, country, quotes); }
	static createProxyConnectKeyboard(t, tgLink) { return proxy.createProxyConnectKeyboard(t, tgLink); }
}

module.exports = KeyboardUtils;
