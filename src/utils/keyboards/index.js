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

/**
 * KeyboardUtils — фасад, объединяющий все клавиатуры.
 *
 * Модули лежат в keyboards/:
 *   common     — btn(), removeKeyboard(), createBackToMenuKeyboard, ошибки, пагинация
 *   menu       — главное меню
 *   payments   — выбор типа, планы, оплата
 *   keys       — мои ключи, детали, статистика
 *   help       — помощь, поддержка
 *   protocols  — приложения, добавление ключей, Outline/VLESS
 *   settings   — настройки, язык
 *   admin      — админ-панель
 *   broadcast  — рассылки
 *   referrals  — реферальная программа
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
	static createMainMenu(t, isAdmin) { return menu.createMainMenu(t, isAdmin); }

	// payments
	static createTypeSelectionKeyboard(t) { return payments.createTypeSelectionKeyboard(t); }
	static createPlansKeyboardByType(t, plans, type) { return payments.createPlansKeyboardByType(t, plans, type); }
	static createPlansKeyboard(t, isAdmin) { return payments.createPlansKeyboard(t, isAdmin); }
	static createPlanDetailsKeyboard(t, planId, planType) { return payments.createPlanDetailsKeyboard(t, planId, planType); }
	static createPaymentConfirmationKeyboard(t, planId) { return payments.createPaymentConfirmationKeyboard(t, planId); }
	static createDirectCheckoutKeyboard(t, planId) { return payments.createDirectCheckoutKeyboard(t, planId); }
	static createAppsDownloadKeyboard(t) { return payments.createAppsDownloadKeyboard(t); }

	// keys
	static createKeysKeyboard(t, keys) { return keysKb.createKeysKeyboard(t, keys); }
	static createKeyDetailsKeyboard(t, keyId) { return keysKb.createKeyDetailsKeyboard(t, keyId); }
	static createKeyStatsKeyboard(t, keyId) { return keysKb.createKeyStatsKeyboard(t, keyId); }

	// help
	static createHelpKeyboard(t) { return help.createHelpKeyboard(t); }
	static createSupportKeyboard(t) { return help.createSupportKeyboard(t); }

	// protocols
	static createHowToAddKeyKeyboard(t) { return protocols.createHowToAddKeyKeyboard(t); }
	static createHowToAddKeyProtocolKeyboard(t) { return protocols.createHowToAddKeyProtocolKeyboard(t); }
	static createVpnAppsProtocolKeyboard(t) { return protocols.createVpnAppsProtocolKeyboard(t); }
	static createOutlineAppsKeyboard(t) { return protocols.createOutlineAppsKeyboard(t); }
	static createVlessOsKeyboard(t) { return protocols.createVlessOsKeyboard(t); }
	static createVlessAppsBackKeyboard(t) { return protocols.createVlessAppsBackKeyboard(t); }

	// settings
	static createSettingsKeyboard(t) { return settings.createSettingsKeyboard(t); }
	static createLanguageKeyboard(t) { return settings.createLanguageKeyboard(t); }

	// admin
	static createAdminKeyboard(t) { return admin.createAdminKeyboard(t); }

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
}

module.exports = KeyboardUtils;
