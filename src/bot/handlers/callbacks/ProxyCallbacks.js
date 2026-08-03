const KeyboardUtils = require('../../../utils/keyboards');
const PlanService = require('../../../services/PlanService');

class ProxyCallbacks {
	constructor(database, paymentService, keysService, settingsService = null) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.settingsService = settingsService;
	}

	/**
	 * Выбор типа прокси. Продукты разные и назначение у них разное —
	 * поясняем прямо здесь, чтобы не купили IPv4 «для Telegram».
	 */
	async handleProxyMenu(ctx) {
		const t = ctx.i18n.t;

		const ownEnabled = !this.settingsService || this.settingsService.isSalesEnabled('mtproto');
		const px6Enabled = !this.settingsService || this.settingsService.isSalesEnabled('px6');

		if (!ownEnabled && !px6Enabled) {
			await ctx.editMessageText(
				t('payments.sales_disabled', { ns: 'message' }),
				{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
			);
			return;
		}

		await ctx.editMessageText(t('proxy.menu_intro', { ns: 'message' }), {
			...KeyboardUtils.createProxyMenuKeyboard(t, { ownEnabled, px6Enabled }),
			parse_mode: 'HTML'
		});
	}

	/** Наш MTProto-прокси (NL): пояснение + сроки */
	async handleMtprotoPlans(ctx) {
		const t = ctx.i18n.t;
		const { ADMIN_IDS } = require('../../../config/constants');
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);

		if (this.settingsService && !this.settingsService.isSalesEnabled('mtproto')) {
			await ctx.editMessageText(
				t('payments.sales_disabled', { ns: 'message' }),
				{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
			);
			return;
		}

		const plans = PlanService.getProxyPlans(isAdmin);

		await ctx.editMessageText(t('proxy.intro', { ns: 'message' }), {
			...KeyboardUtils.createProxyPlansKeyboard(t, plans),
			parse_mode: 'HTML'
		});
	}
}

module.exports = ProxyCallbacks;
