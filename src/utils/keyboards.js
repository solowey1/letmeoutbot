const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../config/constants');
const { BUTTON_PRESETS } = require('../config/buttonPresets');
const PlanService = require('../services/PlanService');

class KeyboardUtils {
	static btn(t, preset, action = null) {
		const config = BUTTON_PRESETS[preset] || {};
		const text = config.text ? t(config.text) : preset;
		const data = action || config.action;
		const button = Markup.button.callback(text, data);
		if (config.style) button.style = config.style;
		if (config.icon) button.icon_custom_emoji_id = config.icon;
		return button;
	}

	static removeKeyboard() {
		return Markup.removeKeyboard();
	}

	static createMainMenu(t, isAdmin = false) {
		const buttons = [
			[KeyboardUtils.btn(t, 'buy')],
			[Markup.button.callback(t('buttons.my_keys'), CALLBACK_ACTIONS.KEYS.MENU)],
			[Markup.button.callback(t('buttons.referral'), CALLBACK_ACTIONS.REFERRAL.MENU)],
			[Markup.button.callback(t('buttons.settings'), CALLBACK_ACTIONS.SETTINGS.MENU)],
		];

		if (isAdmin) {
			buttons.push([KeyboardUtils.btn(t, 'admin')]);
		}

		buttons.push([KeyboardUtils.btn(t, 'help')]);

		return Markup.inlineKeyboard(buttons);
	}

	static createPlansKeyboard(t, isAdmin = false) {
		const plans = PlanService.getAllPlans(isAdmin);
		const buttons = [];

		plans.forEach(plan => {
			const formatted = PlanService.formatPlanForDisplay(t, plan);
			buttons.push([Markup.button.callback(
				`${formatted.displayName} - ${formatted.displayPrice}`,
				`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_${plan.id}`
			)]);
		});

		buttons.push([KeyboardUtils.btn(t, 'home')]);

		return Markup.inlineKeyboard(buttons);
	}

	// ── Детали плана ────────────────────────────────────────────────
	static createPlanDetailsKeyboard(t, planId, planType) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'pay', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
			[KeyboardUtils.btn(t, 'back', `plans_type_${planType}`)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createKeysKeyboard(t, keys) {
		const buttons = [];

		if (keys && keys.length > 0) {
			keys.forEach((key) => {
				const plan = PlanService.getPlanById(key.plan_id);
				if (plan) {
					const formatted = PlanService.formatPlanForDisplay(t, plan);
					const status = key.status === 'active' ? '🟢' : '🔴';
					buttons.push([
						Markup.button.callback(
							`${status} ${formatted.displayName}`,
							`${CALLBACK_ACTIONS.KEYS.DETAILS}_${key.id}`
						)
					]);
				}
			});

			buttons.push([Markup.button.callback(t('buttons.buy.more'), CALLBACK_ACTIONS.KEYS.BUY)]);
		} else {
			buttons.push([KeyboardUtils.btn(t, 'buy_first')]);
		}

		buttons.push([KeyboardUtils.btn(t, 'home')]);

		return Markup.inlineKeyboard(buttons);
	}

	static createKeyDetailsKeyboard(t, keyId) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.stats'), `${CALLBACK_ACTIONS.KEYS.STATS}_${keyId}`)],
			[Markup.button.callback(t('buttons.refresh_key'), `${CALLBACK_ACTIONS.KEYS.REFRESH}_${keyId}`)],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.KEYS.MENU)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createKeyStatsKeyboard(t, keyId) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'back', `${CALLBACK_ACTIONS.KEYS.DETAILS}_${keyId}`)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createPaymentConfirmationKeyboard(t, planId) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.confirm_purchase'), `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
			[Markup.button.callback(t('buttons.cancel'), CALLBACK_ACTIONS.KEYS.BUY)]
		]);
	}

	static createDirectCheckoutKeyboard(t, planId) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'pay', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.KEYS.BUY)]
		]);
	}

	static createAdminKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				Markup.button.callback(t('buttons.admin.users'), CALLBACK_ACTIONS.ADMIN.USERS.MENU),
				Markup.button.callback(t('buttons.admin.stats'), CALLBACK_ACTIONS.ADMIN.STATS.MENU)
			],
			[
				Markup.button.callback(t('buttons.admin.payments'), CALLBACK_ACTIONS.ADMIN.PAYMENTS.MENU),
				Markup.button.callback(t('buttons.admin.keys'), CALLBACK_ACTIONS.ADMIN.KEYS.MENU)
			],
			[
				Markup.button.callback(t('buttons.admin.pending_keys'), CALLBACK_ACTIONS.ADMIN.KEYS.PENDING),
				Markup.button.callback(t('buttons.admin.pending_withdrawals'), CALLBACK_ACTIONS.ADMIN.WITHDRAWALS.PENDING)
			],
			[
				Markup.button.callback(t('buttons.admin.broadcast'), CALLBACK_ACTIONS.ADMIN.BROADCAST),
				Markup.button.callback(t('buttons.admin.settings'), CALLBACK_ACTIONS.ADMIN.SETTINGS)
			],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOME)]
		]);
	}

	static createBroadcastAudienceKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.admin.broadcast_all'), CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.ALL)],
			[Markup.button.callback(t('buttons.admin.broadcast_active'), CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.ACTIVE)],
			[
				Markup.button.callback(t('buttons.admin.broadcast_buyers'), CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.BUYERS),
				Markup.button.callback(t('buttons.admin.broadcast_non_buyers'), CALLBACK_ACTIONS.ADMIN.BROADCAST_AUDIENCE.NON_BUYERS),
			],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.ADMIN.MENU)],
		]);
	}

	static createBackToMenuKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createHelpKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'buy')],
			[Markup.button.callback(t('buttons.vpn_apps'), CALLBACK_ACTIONS.BASIC.VPN_APPS)],
			[Markup.button.callback(t('buttons.how_to_add_key'), CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY)],
			[Markup.button.callback(t('buttons.support'), CALLBACK_ACTIONS.BASIC.SUPPORT)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Как добавить ключ: выбор протокола ──────��───────────────────
	static createHowToAddKeyKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback('🌿 Outline', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_OUTLINE)],
			[Markup.button.callback('⚡ VLESS', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_VLESS)],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Как добавить ключ: инструкция ───────────────────────────────
	static createHowToAddKeyBackKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Приложения для VPN: выбор протокола ─────────────────────────
	static createVpnAppsProtocolKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback('🌿 Outline', CALLBACK_ACTIONS.BASIC.VPN_APPS_OUTLINE)],
			[Markup.button.callback('⚡ VLESS', CALLBACK_ACTIONS.BASIC.VPN_APPS_VLESS)],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Outline: список приложений ──────────────────────────────────
	static createOutlineAppsKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.url(t('buttons.apps.website'), 'https://getoutline.org/ru/get-started/#step-3')],
			[
				Markup.button.url(t('buttons.apps.android'), 'https://play.google.com/store/apps/details?id=org.outline.android.client'),
				Markup.button.url(t('buttons.apps.ios'), 'https://apps.apple.com/app/outline-app/id1356177741')
			],
			[
				Markup.button.url(t('buttons.apps.windows'), 'https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe'),
				Markup.button.url(t('buttons.apps.macos'), 'https://s3.amazonaws.com/outline-releases/client/macos/stable/Outline-Client.dmg')
			],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── VLESS: выбор ОС ─────────────────────────────────────────────
	static createVlessOsKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback('🤖 Android', CALLBACK_ACTIONS.BASIC.VLESS_APPS_ANDROID)],
			[Markup.button.callback('📱 iOS', CALLBACK_ACTIONS.BASIC.VLESS_APPS_IOS)],
			[Markup.button.callback('🪟 Windows', CALLBACK_ACTIONS.BASIC.VLESS_APPS_WINDOWS)],
			[Markup.button.callback('🍎 macOS', CALLBACK_ACTIONS.BASIC.VLESS_APPS_MACOS)],
			[Markup.button.callback('🐧 Linux', CALLBACK_ACTIONS.BASIC.VLESS_APPS_LINUX)],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── VLESS: список приложений для конкретной ОС ──────────────────
	static createVlessAppsBackKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS_VLESS)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createSupportKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.url(t('buttons.contact_support'), 'https://t.me/letmeoutsupportbot')],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createSettingsKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'language')],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createLanguageKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'lang_ru')],
			[KeyboardUtils.btn(t, 'lang_en')],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.SETTINGS.MENU)]
		]);
	}

	static createErrorKeyboard(t, backAction = CALLBACK_ACTIONS.BASIC.HOME) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.retry'), CALLBACK_ACTIONS.BASIC.RETRY)],
			[KeyboardUtils.btn(t, 'back', backAction)]
		]);
	}

	static createPaginatedKeyboard(t, items, currentPage, itemsPerPage, callbackPrefix, backAction) {
		const buttons = [];
		const startIndex = currentPage * itemsPerPage;
		const endIndex = Math.min(startIndex + itemsPerPage, items.length);

		for (let i = startIndex; i < endIndex; i++) {
			const item = items[i];
			buttons.push([Markup.button.callback(item.name, `${callbackPrefix}_${item.id}`)]);
		}

		const navButtons = [];
		if (currentPage > 0) {
			navButtons.push(Markup.button.callback(t('buttons.pagination.prev'), `page_${callbackPrefix}_${currentPage - 1}`));
		}

		navButtons.push(Markup.button.callback(`${currentPage + 1}/${Math.ceil(items.length / itemsPerPage)}`, 'current_page'));

		if (endIndex < items.length) {
			navButtons.push(Markup.button.callback(t('buttons.pagination.next'), `page_${callbackPrefix}_${currentPage + 1}`));
		}

		if (navButtons.length > 1) {
			buttons.push(navButtons);
		}

		buttons.push([KeyboardUtils.btn(t, 'back', backAction)]);

		return Markup.inlineKeyboard(buttons);
	}

	static createReferralMenuKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				Markup.button.callback(t('buttons.referral_actions.invite'), CALLBACK_ACTIONS.REFERRAL.INVITE),
				Markup.button.callback(t('buttons.referral_actions.get_link'), CALLBACK_ACTIONS.REFERRAL.GET_LINK)
			],
			[Markup.button.callback(t('buttons.referral_actions.my_referrals'), CALLBACK_ACTIONS.REFERRAL.MY_REFERRALS)],
			[
				Markup.button.callback(t('buttons.referral_actions.withdraw'), CALLBACK_ACTIONS.REFERRAL.WITHDRAW),
				Markup.button.callback(t('buttons.referral_actions.history'), CALLBACK_ACTIONS.REFERRAL.HISTORY)
			],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	static createReferralInviteKeyboard(t, shareText) {
		return Markup.inlineKeyboard([
			[Markup.button.switchToChat(t('buttons.referral_actions.invite'), shareText)],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.REFERRAL.MENU)]
		]);
	}

	static createReferralBackKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.REFERRAL.MENU)]
		]);
	}

	static createWithdrawalConfirmKeyboard(t, amount) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(`${t('buttons.referral_actions.withdraw_confirm')} ${amount} ⭐`, CALLBACK_ACTIONS.REFERRAL.CONFIRM_WITHDRAW)],
			[Markup.button.callback(t('buttons.cancel'), CALLBACK_ACTIONS.REFERRAL.MENU)]
		]);
	}

	// ── Выбор типа подключения ──────────────────────────────────────
	static createTypeSelectionKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback('🌿 Outline VPN', CALLBACK_ACTIONS.KEYS.TYPE_OUTLINE)],
			[Markup.button.callback('⚡ VLESS Reality', CALLBACK_ACTIONS.KEYS.TYPE_VLESS)],
			[Markup.button.callback('👑 Outline + VLESS (скидка 20%)', CALLBACK_ACTIONS.KEYS.TYPE_BOTH)],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Список планов по типу ───────────────────────────────────────
	static createPlansKeyboardByType(t, plans, type) {
		const buttons = plans.map(plan => {
			const limit = plan.dataLimitGB > 0 ? `${plan.dataLimitGB} GB` : 'Безлимит';
			return [Markup.button.callback(
				`${plan.emoji} ${limit} — ${plan.price} ⭐`,
				`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_${plan.id}`
			)];
		});

		buttons.push([KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.KEYS.BUY)]);
		buttons.push([KeyboardUtils.btn(t, 'home')]);

		return Markup.inlineKeyboard(buttons);
	}
}

module.exports = KeyboardUtils;
