const axios = require('axios');

/**
 * Курс доллара к рублю для пересчёта закупки px6 в звёзды.
 *
 * Источники бесплатные и без ключа, пробуются по порядку:
 *   1) ЦБ РФ (cbr-xml-daily.ru) — официальный курс, обновляется раз в сутки;
 *   2) open.er-api.com — рыночный курс, если ЦБ недоступен.
 *
 * Кэш на час: цена показывается на каждом экране выбора срока, ходить за
 * курсом на каждый показ незачем. Если обновить курс не удалось, а в кэше
 * есть просроченное значение — берём его: продать по вчерашнему курсу
 * лучше, чем не продать вовсе.
 */

const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 7000;

const SOURCES = [
	{
		name: 'ЦБ РФ',
		url: 'https://www.cbr-xml-daily.ru/daily_json.js',
		extract: (data) => Number(data?.Valute?.USD?.Value)
	},
	{
		name: 'open.er-api.com',
		url: 'https://open.er-api.com/v6/latest/USD',
		extract: (data) => Number(data?.rates?.RUB)
	}
];

class CurrencyService {
	constructor({ ttlMs = TTL_MS } = {}) {
		this.ttlMs = ttlMs;
		this.cache = null;       // { rate, fetchedAt, source }
		this._inFlight = null;
	}

	get cached() {
		return this.cache;
	}

	isFresh() {
		return Boolean(this.cache) && Date.now() - this.cache.fetchedAt < this.ttlMs;
	}

	/**
	 * Сколько рублей стоит доллар.
	 * @returns {Promise<number>}
	 */
	async getUsdRub() {
		if (this.isFresh()) return this.cache.rate;

		// Параллельные покупки не должны устраивать шквал запросов к источнику
		if (!this._inFlight) {
			this._inFlight = this._refresh().finally(() => { this._inFlight = null; });
		}

		try {
			return await this._inFlight;
		} catch (error) {
			if (this.cache) {
				console.warn(`⚠️ Курс USD/RUB не обновился (${error.message}), берём из кэша от ${new Date(this.cache.fetchedAt).toISOString()}`);
				return this.cache.rate;
			}
			throw error;
		}
	}

	async _refresh() {
		for (const source of SOURCES) {
			try {
				const { data } = await axios.get(source.url, { timeout: TIMEOUT_MS });
				const rate = source.extract(data);
				if (!Number.isFinite(rate) || rate <= 0) throw new Error('некорректный курс в ответе');

				this.cache = { rate, fetchedAt: Date.now(), source: source.name };
				console.log(`💱 Курс USD/RUB: ${rate} (${source.name})`);
				return rate;
			} catch (error) {
				console.error(`⚠️ Курс USD/RUB, источник ${source.name}:`, error.message);
			}
		}
		throw new Error('ни один источник курса USD/RUB не ответил');
	}
}

module.exports = CurrencyService;
