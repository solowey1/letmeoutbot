const Px6Service = require('./Px6Service');

/**
 * Тарифы px6 динамические: цена берётся из getprice, умножается на наценку
 * и конвертируется в Telegram Stars.
 *
 * Настройки (админка → Настройки → Proxy px6):
 *   px6_markup_percent — наценка в процентах поверх закупки;
 *   px6_star_rate      — сколько единиц валюты аккаунта px6 стоит 1 звезда.
 *
 * Курс задаётся вручную, а не тянется извне: у px6 аккаунт может быть в RUB
 * или USD, и привязываться к внешнему источнику курса ради одного числа
 * дороже, чем раз в месяц поправить его в админке.
 *
 * Синтетический id тарифа: px6_<version>_<country>_<period>, например
 * px6_6_ru_30. По нему покупка восстанавливается после оплаты, не таская
 * параметры через payload.
 */

// Сроки, которые показываем пользователю (дни). Соответствуют сеткам px6.
const PERIODS = [7, 30, 90];

// Версии, доступные к продаже. MTproto (5) намеренно нет: у бота есть
// собственный MTProto-прокси, покупать его на стороне незачем.
const SALE_VERSIONS = [
	Px6Service.VERSION.IPV6,
	Px6Service.VERSION.IPV4,
	Px6Service.VERSION.IPV4_SHARED
];

const PLAN_ID_RE = /^px6_(\d+)_([a-z]{2})_(\d+)$/;

class Px6PricingService {
	constructor(px6Service, settingsService) {
		this.px6 = px6Service;
		this.settings = settingsService;
	}

	static get PERIODS() { return PERIODS; }
	static get SALE_VERSIONS() { return SALE_VERSIONS; }

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
	 */
	toStars(costInAccountCurrency) {
		const markup = Number(this.settings.get('px6_markup_percent'));
		const rate = Number(this.settings.get('px6_star_rate'));

		if (!Number.isFinite(rate) || rate <= 0) throw new Error('px6_star_rate не задан');
		if (!Number.isFinite(markup) || markup < 0) throw new Error('px6_markup_percent не задан');

		const withMarkup = costInAccountCurrency * (1 + markup / 100);
		return Math.max(1, Math.ceil(withMarkup / rate));
	}

	/**
	 * Цена одного прокси на срок — в звёздах и в валюте закупки.
	 * @returns {{stars: number, cost: number, currency: string}}
	 */
	async quote({ version, period, count = 1 }) {
		const { price, currency } = await this.px6.getPrice({ count, period, version });
		return { stars: this.toStars(price), cost: price, currency };
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
