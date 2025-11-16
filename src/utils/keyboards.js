const { Markup } = require('telegraf');
const { CALLBACK_ACTIONS } = require('../config/constants');
const PlanService = require('../services/PlanService');

class KeyboardUtils {
	static createMainMenu(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.buy.key'), CALLBACK_ACTIONS.BUY_PLAN)],
			[Markup.button.callback(t('buttons.my_keys'), CALLBACK_ACTIONS.MY_KEYS)],
			[Markup.button.callback(t('buttons.settings'), CALLBACK_ACTIONS.SETTINGS)],
			[Markup.button.callback(t('buttons.help'), 'help')],
		]);
	}

	static createPlansKeyboard(t, isAdmin = false) {
		const plans = PlanService.getAllPlans(isAdmin);
		const buttons = [];

		plans.forEach(plan => {
			const formatted = PlanService.formatPlanForDisplay(plan);
			buttons.push([Markup.button.callback(
				`${formatted.displayName} - ${formatted.displayPrice}`,
				`checkout_${plan.id}`
			)]);
		});

		buttons.push([Markup.button.callback(t('buttons.back_to_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]);

		return Markup.inlineKeyboard(buttons);
	}

	static createPlanDetailsKeyboard(t, planId) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.pay'), `${CALLBACK_ACTIONS.CONFIRM_PURCHASE}_${planId}`)],
			[Markup.button.callback(t('buttons.back'), CALLBACK_ACTIONS.BUY_PLAN)],
			[Markup.button.callback(t('buttons.main_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]
		]);
	}

	static createKeysKeyboard(t, keys) {
		const buttons = [];

		if (keys && keys.length > 0) {
			keys.forEach((sub) => {
				const plan = PlanService.getPlanById(sub.plan_id);
				if (plan) {
					const formatted = PlanService.formatPlanForDisplay(plan);
					const status = sub.status === 'active' ? '🟢' : '🔴';
					buttons.push([
						Markup.button.callback(
							`${status} ${formatted.displayName}`,
							`sub_details_${sub.id}`
						)
					]);
				}
			});

			buttons.push([Markup.button.callback(t('buttons.buy.more'), CALLBACK_ACTIONS.BUY_PLAN)]);
		} else {
			buttons.push([Markup.button.callback(t('buttons.buy.first'), CALLBACK_ACTIONS.BUY_PLAN)]);
		}

		buttons.push([Markup.button.callback(t('buttons.back_to_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]);

		return Markup.inlineKeyboard(buttons);
	}

	static createKeyDetailsKeyboard(t, keyId) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.stats'), `sub_stats_${keyId}`)],
			[Markup.button.callback(t('buttons.main_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]
		]);
	}

	static createPaymentConfirmationKeyboard(t, planId) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.confirm_purchase'), `confirm_payment_${planId}`)],
			[Markup.button.callback(t('buttons.cancel'), CALLBACK_ACTIONS.BUY_PLAN)]
		]);
	}

	static createDirectCheckoutKeyboard(t, planId) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.pay'), `confirm_payment_${planId}`)],
			[Markup.button.callback(t('buttons.back'), CALLBACK_ACTIONS.BUY_PLAN)]
		]);
	}

	static createAdminKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				Markup.button.callback(t('buttons.admin.users'), CALLBACK_ACTIONS.ADMIN_USERS),
				Markup.button.callback(t('buttons.admin.stats'), CALLBACK_ACTIONS.ADMIN_STATS)
			],
			[
				Markup.button.callback(t('buttons.admin.payments'), 'admin_payments'),
				Markup.button.callback(t('buttons.admin.keys'), 'admin_keys')
			],
			[
				Markup.button.callback(t('buttons.admin.pending_keys'), CALLBACK_ACTIONS.ADMIN_PENDING_KEYS),
				Markup.button.callback(t('buttons.admin.broadcast'), 'admin_broadcast')
			],
			[
				Markup.button.callback(t('buttons.admin.settings'), 'admin_settings')
			],
			[Markup.button.callback(t('buttons.back'), CALLBACK_ACTIONS.BACK_TO_MENU)]
		]);
	}

	static createBackToMenuKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.main_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]
		]);
	}

	static createHelpKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.buy.key'), CALLBACK_ACTIONS.BUY_PLAN)],
			[Markup.button.callback(t('buttons.download_apps'), 'download_apps')],
			[Markup.button.callback(t('buttons.support'), 'support')],
			[Markup.button.callback(t('buttons.back_to_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]
		]);
	}

	static createAppsDownloadKeyboard(t) {
		return Markup.inlineKeyboard([
			[
				Markup.button.url(t('buttons.apps.website'), 'https://getoutline.org/ru/get-started/#step-3'),
			],
			[
				Markup.button.url(t('buttons.apps.android'), 'https://play.google.com/store/apps/details?id=org.outline.android.client'),
				Markup.button.url(t('buttons.apps.ios'), 'https://apps.apple.com/app/outline-app/id1356177741')
			],
			[
				Markup.button.url(t('buttons.apps.windows'), 'https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe'),
				Markup.button.url(t('buttons.apps.macos'), 'https://s3.amazonaws.com/outline-releases/client/macos/stable/Outline-Client.dmg')
			],
			[Markup.button.callback(t('buttons.back'), 'help')]
		]);
	}

	static createSettingsKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.language'), CALLBACK_ACTIONS.CHANGE_LANGUAGE)],
			[Markup.button.callback(t('buttons.back_to_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]
		]);
	}

	static createLanguageKeyboard(t) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.languages.russian'), 'set_lang_ru')],
			[Markup.button.callback(t('buttons.languages.english'), 'set_lang_en')],
			[Markup.button.callback(t('buttons.back'), CALLBACK_ACTIONS.SETTINGS)]
		]);
	}

	static createErrorKeyboard(t, backAction = CALLBACK_ACTIONS.BACK_TO_MENU) {
		return Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.retry'), 'retry')],
			[Markup.button.callback(t('buttons.back'), backAction)]
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

		buttons.push([Markup.button.callback(t('buttons.back'), backAction)]);

		return Markup.inlineKeyboard(buttons);
	}

	static removeKeyboard() {
		return Markup.removeKeyboard();
	}
}

module.exports = KeyboardUtils;
