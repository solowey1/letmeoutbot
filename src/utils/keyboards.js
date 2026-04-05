const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../config/constants');
const { BUTTON_PRESETS } = require('../config/buttonPresets');
const PlanService = require('../services/PlanService');

class KeyboardUtils {
	/**
	 * Создать кнопку по пресету.
	 * @param {Function} t — функция перевода
	 * @param {string} preset — имя пресета из BUTTON_PRESETS
	 * @param {string|null} action — переопределить action из пресета (для back, pay и т.д.)
	 */
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

	// ── Кнопка "Домой" ──────────────────────────────────────────────
	static createBackToMenuKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Главное меню ────────────────────────────────────────────────
	static createMainMenu(t, isAdmin = false) {
		const buttons = [
			[KeyboardUtils.btn(t, 'buy')],
			[KeyboardUtils.btn(t, 'my_keys')],
			[KeyboardUtils.btn(t, 'referral')],
			[KeyboardUtils.btn(t, 'settings')],
		];

		if (isAdmin) {
			buttons.push([KeyboardUtils.btn(t, 'admin')]);
		}

		buttons.push([KeyboardUtils.btn(t, 'help')]);

		return Markup.inlineKeyboard(buttons);
	}

	// ── Планы (старая клавиатура) ───────────────────────────────────
	static createPlansKeyboard(t, isAdmin = false) {
		const plans = PlanService.getAllPlans(isAdmin);
		const buttons = [];

		plans.forEach(plan => {
			const formatted = PlanService.formatPlanForDisplay(t, plan);
			const button = Markup.button.callback(
				`${formatted.displayName} - ${formatted.displayPrice}`,
				`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_${plan.id}`
			);
			// button.icon = '';
			buttons.push([button]);
		});

		buttons.push([KeyboardUtils.btn(t, 'home')]);

		return Markup.inlineKeyboard(buttons);
	}

	// ── Детали плана ────────────────────────────────────────────────
	static createPlanDetailsKeyboard(t, planId, planType) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'pay', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
			[
				KeyboardUtils.btn(t, 'back', `plans_type_${planType}`),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Мои ключи ───────────────────────────────────────────────────
	static createKeysKeyboard(t, keys) {
		const buttons = [];

		if (keys && keys.length > 0) {
			keys.forEach((key) => {
				const plan = PlanService.getPlanById(key.plan_id);
				if (plan) {
					const formatted = PlanService.formatPlanForDisplay(t, plan);
					const style = key.status === 'active' ? 'success' : 'danger';
					const button = Markup.button.callback(
						formatted.displayName,
						`${CALLBACK_ACTIONS.KEYS.DETAILS}_${key.id}`
					);
					button.style = style;
					buttons.push([button]);
				}
			});

			buttons.push([KeyboardUtils.btn(t, 'buy_more')]);
		} else {
			buttons.push([KeyboardUtils.btn(t, 'buy_first')]);
		}

		buttons.push([KeyboardUtils.btn(t, 'home')]);

		return Markup.inlineKeyboard(buttons);
	}

	// ── Детали ключа ────────────────────────────────────────────────
	static createKeyDetailsKeyboard(t, keyId) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'stats', `${CALLBACK_ACTIONS.KEYS.STATS}_${keyId}`)],
			[KeyboardUtils.btn(t, 'refresh_key', `${CALLBACK_ACTIONS.KEYS.REFRESH}_${keyId}`)],
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.KEYS.MENU),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Статистика ключа ────────────────────────────────────────────
	static createKeyStatsKeyboard(t, keyId) {
		return Markup.inlineKeyboard([
			[
				KeyboardUtils.btn(t, 'back', `${CALLBACK_ACTIONS.KEYS.DETAILS}_${keyId}`),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Подтверждение покупки ────────────────────────────────────────
	static createPaymentConfirmationKeyboard(t, planId) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'confirm', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
			[KeyboardUtils.btn(t, 'cancel', CALLBACK_ACTIONS.KEYS.BUY)]
		]);
	}

	// ── Быстрая оплата ──────────────────────────────────────────────
	static createDirectCheckoutKeyboard(t, planId) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'pay', `${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${planId}`)],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.KEYS.BUY)]
		]);
	}

	// ── Админка ─────────────────────────────────────────────────────
	static createAdminKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				KeyboardUtils.btn(t, 'admin_users'),
				KeyboardUtils.btn(t, 'admin_stats')
			],
			[
				KeyboardUtils.btn(t, 'admin_payments'),
				KeyboardUtils.btn(t, 'admin_keys')
			],
			[KeyboardUtils.btn(t, 'admin_withdrawals')],
			[
				KeyboardUtils.btn(t, 'admin_broadcast'),
				KeyboardUtils.btn(t, 'admin_settings')
			],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOME)]
		]);
	}

	// ── Аудитория рассылки ──────────────────────────────────────────
	static createBroadcastAudienceKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'broadcast_all')],
			[KeyboardUtils.btn(t, 'broadcast_active')],
			[
				KeyboardUtils.btn(t, 'broadcast_buyers'),
				KeyboardUtils.btn(t, 'broadcast_non_buyers'),
			],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.ADMIN.MENU)],
		]);
	}

	// ── Помощь ──────────────────────────────────────────────────────
	static createHelpKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'buy')],
			[KeyboardUtils.btn(t, 'vpn_apps')],
			[KeyboardUtils.btn(t, 'how_to_add_key')],
			[KeyboardUtils.btn(t, 'support')],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Как добавить ключ: выбор протокола ──────────────────────────
	static createHowToAddKeyKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'outline', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_OUTLINE)],
			[KeyboardUtils.btn(t, 'vless', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY_VLESS)],
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Как добавить ключ: инструкция ───────────────────────────────
	static createHowToAddKeyBackKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HOW_TO_ADD_KEY),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Приложения для VPN: выбор протокола ─────────────────────────
	static createVpnAppsProtocolKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'outline', CALLBACK_ACTIONS.BASIC.VPN_APPS_OUTLINE)],
			[KeyboardUtils.btn(t, 'vless', CALLBACK_ACTIONS.BASIC.VPN_APPS_VLESS)],
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Outline: список приложений ──────────────────────────────────
	static createOutlineAppsKeyboard(t) {
		const buttons = {
			website: Markup.button.url(t('buttons.apps.website'), 'https://getoutline.org/ru/get-started/#step-3'),
			android: Markup.button.url(t('buttons.apps.android'), 'https://play.google.com/store/apps/details?id=org.outline.android.client'),
			ios: Markup.button.url(t('buttons.apps.ios'), 'https://apps.apple.com/app/outline-app/id1356177741'),
			windows: Markup.button.url(t('buttons.apps.windows'), 'https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe'),
			macos: Markup.button.url(t('buttons.apps.macos'), 'https://s3.amazonaws.com/outline-releases/client/macos/stable/Outline-Client.dmg')
		};
		buttons.website.icon = '5776233299424843260';
		buttons.android.icon = '6030400221232501136';
		buttons.ios.icon = '5775870512127283512';
		buttons.windows.icon = '5837069325034331827';
		buttons.macos.icon = '5942734685976138521';

		return Markup.inlineKeyboard([
			[
				buttons.website
			],
			[
				buttons.android,
				buttons.ios,
			],
			[
				buttons.windows,
				buttons.macos,
			],
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── VLESS: выбор ОС ─────────────────────────────────────────────
	static createVlessOsKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'os_android')],
			[KeyboardUtils.btn(t, 'os_ios')],
			[KeyboardUtils.btn(t, 'os_windows')],
			[KeyboardUtils.btn(t, 'os_macos')],
			[KeyboardUtils.btn(t, 'os_linux')],
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── VLESS: список приложений для конкретной ОС ──────────────────
	static createVlessAppsBackKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.VPN_APPS_VLESS),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Поддержка ───────────────────────────────────────────────────
	static createSupportKeyboard(t) {
		const buttonContactSupport = Markup.button.url(t('buttons.contact_support'), 'https://t.me/letmeoutsupportbot');
		buttonContactSupport.icon = '6021618194228187816';
		return Markup.inlineKeyboard([
			[buttonContactSupport],
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.BASIC.HELP),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Настройки ───────────────────────────────────────────────────
	static createSettingsKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'language')],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Выбор языка ─────────────────────────────────────────────────
	static createLanguageKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'lang_ru')],
			[KeyboardUtils.btn(t, 'lang_en')],
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.SETTINGS.MENU),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	// ── Ошибка ──────────────────────────────────────────────────────
	static createErrorKeyboard(t, backAction = CALLBACK_ACTIONS.BASIC.HOME) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'retry')],
			[KeyboardUtils.btn(t, 'back', backAction)]
		]);
	}

	// ── Пагинация ───────────────────────────────────────────────────
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
			navButtons.push(KeyboardUtils.btn(t, 'page_prev', `page_${callbackPrefix}_${currentPage - 1}`));
		}

		navButtons.push(Markup.button.callback(
			`${currentPage + 1}/${Math.ceil(items.length / itemsPerPage)}`,
			'current_page'
		));

		if (endIndex < items.length) {
			navButtons.push(KeyboardUtils.btn(t, 'page_next', `page_${callbackPrefix}_${currentPage + 1}`));
		}

		if (navButtons.length > 1) {
			buttons.push(navButtons);
		}

		buttons.push([KeyboardUtils.btn(t, 'back', backAction)]);

		return Markup.inlineKeyboard(buttons);
	}

	// ── Реферальная программа ────────────────────────────────────────
	static createReferralMenuKeyboard(t, shareText) {
		const buttonInvite = Markup.button.switchToChat(t('buttons.referral_actions.invite'), shareText);
		buttonInvite.icon = '6037622221625626773';
		return Markup.inlineKeyboard([
			[
				KeyboardUtils.btn(t, 'ref_get_link'),
			],
			[
				KeyboardUtils.btn(t, 'ref_my_referrals'),
				buttonInvite,
				// KeyboardUtils.btn(t, 'ref_invite'),
			],
			[
				KeyboardUtils.btn(t, 'ref_withdraw'),
				KeyboardUtils.btn(t, 'ref_history'),
			],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// Отдельное меню для `KeyboardUtils.btn(t, 'ref_invite')`
	static createReferralInviteKeyboard(t, shareText) {
		const buttonInvite = Markup.button.switchToChat(t('buttons.referral_actions.invite'), shareText);
		buttonInvite.icon = '6037622221625626773';
		return Markup.inlineKeyboard([
			[buttonInvite],
			[KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.REFERRAL.MENU)]
		]);
	}

	static createReferralBackKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.REFERRAL.MENU),
				KeyboardUtils.btn(t, 'home')
			]
		]);
	}

	static createWithdrawalConfirmKeyboard(t, amount) {
		const buttonWithdraw = Markup.button.callback(
			`${amount} — ${t('buttons.referral_actions.withdraw_confirm')}`,
			CALLBACK_ACTIONS.REFERRAL.CONFIRM_WITHDRAW
		);
		buttonWithdraw.icon = '5848259999763011021';
		return Markup.inlineKeyboard([
			[buttonWithdraw],
			[KeyboardUtils.btn(t, 'cancel', CALLBACK_ACTIONS.REFERRAL.MENU)]
		]);
	}

	// ── Выбор типа подключения ──────────────────────────────────────
	static createTypeSelectionKeyboard(t) {
		return Markup.inlineKeyboard([
			[KeyboardUtils.btn(t, 'type_outline')],
			[KeyboardUtils.btn(t, 'type_vless')],
			[KeyboardUtils.btn(t, 'type_both')],
			[KeyboardUtils.btn(t, 'home')]
		]);
	}

	// ── Список планов по типу ───────────────────────────────────────
	static createPlansKeyboardByType(t, plans, type) {
		const buttons = plans.map(plan => {
			const limit = plan.dataLimitGB > 0 ? `${plan.dataLimitGB} ${t('common.memory.gb')}` : t('plans.unlimited');
			const button = Markup.button.callback(
				`${plan.price} — ${plan.emoji} ${limit}`,
				`${CALLBACK_ACTIONS.KEYS.CHECKOUT}_${plan.id}`
			);
			button.icon = '5895708410447401643';
			return [button];
		});

		buttons.push([
			KeyboardUtils.btn(t, 'back', CALLBACK_ACTIONS.KEYS.BUY),
			KeyboardUtils.btn(t, 'home')
		]);

		return Markup.inlineKeyboard(buttons);
	}
}

module.exports = KeyboardUtils;
