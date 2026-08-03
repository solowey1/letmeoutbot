const KeyboardUtils = require('../../../utils/keyboards');
const PlanService = require('../../../services/PlanService');

class ProxyCallbacks {
	constructor(database, paymentService, keysService, settingsService = null) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.settingsService = settingsService;
	}

	async handleProxyMenu(ctx) {
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

		const message = t('proxy.intro', { ns: 'message' });
		const keyboard = KeyboardUtils.createProxyPlansKeyboard(t, plans);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}
}

module.exports = ProxyCallbacks;
