const KeyboardUtils = require('../../../utils/keyboards');
const PlanService = require('../../../services/PlanService');
const config = require('../../../config');

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
		// Без ключа поставщика тарифы не посчитать — не показываем типы,
		// по которым покупка всё равно упрётся в заглушку
		const px6Enabled = Boolean(config.px6.apiKey)
			&& (!this.settingsService || this.settingsService.isSalesEnabled('px6'));

		if (!ownEnabled && !px6Enabled) {
			await ctx.editMessageText(
				t('payments.sales_disabled', { ns: 'message' }),
				{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
			);
			return;
		}

		// Текст собирается под то, что реально в списке: рассказывать про
		// IPv4/IPv6, когда их нет в меню, значит обещать несуществующее
		const mtprotoBullet = ownEnabled && px6Enabled
			? 'menu_mtproto_both'
			: (ownEnabled ? 'menu_mtproto_own' : 'menu_mtproto_ext');

		const lines = [
			t('proxy.menu_header', { ns: 'message' }),
			'',
			t(`proxy.${mtprotoBullet}`, { ns: 'message' })
		];

		if (px6Enabled) lines.push(t('proxy.menu_ip', { ns: 'message' }));

		lines.push('', t('proxy.menu_footer', { ns: 'message' }));

		await ctx.editMessageText(lines.join('\n'), {
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
