const Px6Service = require('./Px6Service');
const config = require('../config');

/**
 * Тарифы px6 динамические: цена берётся из getprice и переводится в звёзды.
 *
 * Цепочка пересчёта: закупка (у аккаунта px6 валюта RUB или USD) → доллары
 * по курсу ЦБ (кэш на час) → звёзды по STARS_USD_RATE → +10% наценки.
 * Наценка фиксированная: она часть цены продукта, а не настройка, которую
 * стоит забыть обновить.
 *
 * Синтетический id тарифа: px6_<version>_<country>_<period>, например
 * px6_6_ru_30. По нему покупка восстанавливается после оплаты, не таская
 * параметры через payload.
 */

// Сроки, которые показываем пользователю (дни). Соответствуют сеткам px6.
const PERIODS = [7, 30, 90];

// Наценка поверх конечной стоимости px6, проценты
const MARKUP_PERCENT = 10;

// Все версии, которые продаёт px6, включая MTProto: это их прокси в их
// странах, к нашему собственному MTProto-прокси отношения не имеет.
const SALE_VERSIONS = [
	Px6Service.VERSION.IPV6,
	Px6Service.VERSION.IPV4,
	Px6Service.VERSION.IPV4_SHARED,
	Px6Service.VERSION.MTPROTO
];

const PLAN_ID_RE = /^px6_(\d+)_([a-z]{2})_(\d+)$/;

class Px6PricingService {
	constructor(px6Service, currencyService) {
		this.px6 = px6Service;
		this.currency = currencyService;
	}

	static get PERIODS() { return PERIODS; }
	static get SALE_VERSIONS() { return SALE_VERSIONS; }
	static get MARKUP_PERCENT() { return MARKUP_PERCENT; }

	static buildPlanId(version, country, period) {
		return `px6_${version}_${country}_${period}`;
	}

	/** Разобрать синтетический id обратно в параметры заказа */
	static parsePlanId(planId) {
		const m = PLAN_ID_RE.exec(planId || '');
		if (!m) return null;
		return { version: Number(m[1]), country: m[2], period: Number(m[3]) };
	}

	static isPx6PlanId(planId) {
		return PLAN_ID_RE.test(planId || '');
	}

	/**
	 * Закупочная цена -> цена в звёздах.
	 * Округляем вверх: продать дешевле закупки хуже, чем на звезду дороже.
	 * @param {number} cost - стоимость у px6
	 * @param {string} currency - валюта аккаунта px6: RUB или USD
	 */
	async toStars(cost, currency) {
		const starsUsdRate = Number(config.stars.usdRate);
		if (!Number.isFinite(starsUsdRate) || starsUsdRate <= 0) {
			throw new Error('STARS_USD_RATE не задан');
		}

		const usd = String(currency).toUpperCase() === 'USD'
			? cost
			: cost / await this.currency.getUsdRub();

		const withMarkup = usd * (1 + MARKUP_PERCENT / 100);
		return Math.max(1, Math.ceil(withMarkup / starsUsdRate));
	}

	/**
	 * Цена одного прокси на срок — в звёздах и в валюте закупки.
	 * @returns {{stars: number, cost: number, currency: string}}
	 */
	async quote({ version, period, count = 1 }) {
		const { price, currency } = await this.px6.getPrice({ count, period, version });
		return { stars: await this.toStars(price, currency), cost: price, currency };
	}

	/** Цены сразу на все сроки — для экрана выбора срока */
	async quoteAllPeriods({ version, count = 1 }) {
		const quotes = [];
		for (const period of PERIODS) {
			try {
				const q = await this.quote({ version, period, count });
				quotes.push({ period, ...q });
			} catch (error) {
				console.error(`⚠️ px6: не удалось получить цену за ${period} дн.:`, error.message);
			}
		}
		return quotes;
	}

	/**
	 * Планообразный объект для PaymentService/KeysService.
	 * Цена нужна только на этапе выставления счёта; после оплаты сумма
	 * берётся из записи платежа, поэтому здесь она необязательна.
	 */
	static buildPlan({ version, country, period, stars = 0, t = null }) {
		const id = Px6PricingService.buildPlanId(version, country, period);
		const label = Px6PricingService.versionLabel(version);
		const name = `${label} ${country.toUpperCase()} — ${period} дн.`;

		return {
			id,
			name,
			type: 'px6',
			version,
			country,
			duration: period,
			dataLimitGB: 0,
			dataLimit: 0,
			price: stars,
			invoice: t
				? t('px6.invoice', { ns: 'message', label, country: country.toUpperCase(), days: period })
				: name
		};
	}

	static versionLabel(version) {
		switch (Number(version)) {
			case Px6Service.VERSION.IPV6: return 'IPv6';
			case Px6Service.VERSION.IPV4: return 'IPv4';
			case Px6Service.VERSION.IPV4_SHARED: return 'IPv4 Shared';
			case Px6Service.VERSION.MTPROTO: return 'MTProto';
			default: return `v${version}`;
		}
	}
}

module.exports = Px6PricingService;
