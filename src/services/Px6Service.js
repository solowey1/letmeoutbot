const axios = require('axios');

/**
 * Клиент API px6 (proxy6.net).
 *
 * Контракт по официальной документации «РАЗРАБОТЧИКАМ (API)»:
 *   GET https://px6.link/api/{api_key}/{method}?{params}
 *   Успех:  { status: "yes", user_id, balance, currency, ... }
 *   Ошибка: { status: "no", error_id, error }
 *
 * Ответ всегда 200 даже при ошибке — состояние определяется полем status,
 * поэтому axios-ошибку и прикладную разбираем отдельно.
 */

const BASE_URL = 'https://px6.link/api';

// Документация: не более 3 запросов в секунду, иначе HTTP 429.
// Держим минимальный интервал с запасом и сериализуем очередь.
const MIN_INTERVAL_MS = 350;

const VERSION = {
	IPV4_SHARED: 3,
	IPV4: 4,
	MTPROTO: 5,
	IPV6: 6
};

class Px6Error extends Error {
	constructor(errorId, message) {
		super(message);
		this.name = 'Px6Error';
		this.errorId = Number(errorId);
	}

	/** Ошибки, при которых повторять запрос бессмысленно */
	get isFatal() {
		// 400 — нет денег на балансе, 300 — не хватает прокси в наличии,
		// 100/105 — неверный ключ или IP. Retry их не починит.
		return [100, 105, 110, 200, 210, 220, 230, 240, 250, 260, 270, 280, 300, 400, 410].includes(this.errorId);
	}
}

class Px6Service {
	constructor(apiKey) {
		this.apiKey = apiKey;
		this._chain = Promise.resolve();
		this._lastRequestAt = 0;
	}

	get isConfigured() {
		return Boolean(this.apiKey);
	}

	/** Сериализованная очередь с паузой между запросами — рейт-лимит px6 */
	_schedule(fn) {
		const run = async () => {
			const wait = this._lastRequestAt + MIN_INTERVAL_MS - Date.now();
			if (wait > 0) await new Promise(r => setTimeout(r, wait));
			this._lastRequestAt = Date.now();
			return fn();
		};
		// Ошибка одного запроса не должна рвать цепочку для следующих
		this._chain = this._chain.then(run, run);
		return this._chain;
	}

	async apiRequest(method, params = {}) {
		if (!this.isConfigured) throw new Error('PX6_API_KEY не задан');

		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined || value === null || value === '') continue;
			query.append(key, String(value));
		}
		const qs = query.toString();
		const url = `${BASE_URL}/${this.apiKey}/${method}${qs ? `?${qs}` : ''}`;

		return this._schedule(async () => {
			let data;
			try {
				// Бот обрабатывает апдейты последовательно — таймаут обязателен
				const response = await axios.get(url, { timeout: 20000 });
				data = response.data;
			} catch (error) {
				// Ключ в URL — в лог он попасть не должен
				console.error(`❌ px6 ${method} → ${error.response?.status || error.message}`);
				throw new Error(`px6 недоступен: ${error.response?.status || error.message}`);
			}

			if (!data || data.status !== 'yes') {
				const err = new Px6Error(data?.error_id, data?.error || 'Неизвестная ошибка px6');
				console.error(`❌ px6 ${method} → ${err.errorId}: ${err.message}`);
				throw err;
			}
			return data;
		});
	}

	// ── Методы API ─────────────────────────────────────────────────────────

	/** Список стран (iso2), доступных для версии */
	async getCountries(version) {
		const data = await this.apiRequest('getcountry', { version });
		return data.list || [];
	}

	/** Доступное количество прокси в стране */
	async getCount(country, version) {
		const data = await this.apiRequest('getcount', { country, version });
		return Number(data.count) || 0;
	}

	/**
	 * Стоимость заказа в валюте аккаунта px6.
	 * @returns {{price: number, priceSingle: number, currency: string}}
	 */
	async getPrice({ count, period, version }) {
		const data = await this.apiRequest('getprice', { count, period, version });
		return {
			price: Number(data.price),
			priceSingle: Number(data.price_single),
			currency: data.currency
		};
	}

	/**
	 * Покупка прокси.
	 * @returns {{orderId: number, price: number, proxies: Array}}
	 */
	async buy({ count, period, country, version, descr }) {
		const data = await this.apiRequest('buy', { count, period, country, version, descr });
		return {
			orderId: data.order_id,
			price: Number(data.price),
			currency: data.currency,
			proxies: Px6Service.normalizeList(data.list)
		};
	}

	/** Продление уже купленных прокси */
	async prolong({ period, ids }) {
		const data = await this.apiRequest('prolong', { period, ids: [].concat(ids).join(',') });
		return {
			orderId: data.order_id,
			price: Number(data.price),
			count: Number(data.count),
			proxies: Px6Service.normalizeList(data.list)
		};
	}

	async getProxies({ state = 'all', descr, page, limit } = {}) {
		const data = await this.apiRequest('getproxy', { state, descr, page, limit });
		return Px6Service.normalizeList(data.list);
	}

	async deleteProxies(ids) {
		const data = await this.apiRequest('delete', { ids: [].concat(ids).join(',') });
		return Number(data.count) || 0;
	}

	/** Проверка работоспособности прокси */
	async check(id) {
		const data = await this.apiRequest('check', { ids: id });
		return Boolean(data.proxy_status);
	}

	// ── Вспомогательные ────────────────────────────────────────────────────

	/** list приходит объектом с ключами-id — приводим к массиву */
	static normalizeList(list) {
		if (!list) return [];
		return Array.isArray(list) ? list : Object.values(list);
	}

	/**
	 * Строка подключения для клиента.
	 * У MTProto-версии (5) логина нет, там pass — это secret.
	 *
	 * IPv6-адрес берём в квадратные скобки (RFC 3986): в нём самом есть
	 * двоеточия, и без скобок строку host:port:user:pass нельзя разобрать
	 * обратно — ни нам, ни клиенту.
	 */
	static formatProxy(proxy) {
		// У MTProto-версии логина нет, а pass — это secret. Отдаём ссылкой
		// t.me/proxy: она и показывается, и открывает Telegram по нажатию —
		// ровно как у нашего собственного MTProto-прокси.
		if (Number(proxy.version) === VERSION.MTPROTO) {
			const params = new URLSearchParams({
				server: proxy.host,
				port: String(proxy.port),
				secret: proxy.pass || ''
			});
			return `https://t.me/proxy?${params.toString()}`;
		}

		const host = String(proxy.host || '').includes(':') ? `[${proxy.host}]` : proxy.host;
		return proxy.user
			? `${host}:${proxy.port}:${proxy.user}:${proxy.pass}`
			: `${host}:${proxy.port}`;
	}

	/** Разбор строки, собранной formatProxy, обратно в поля */
	static parseProxyLine(line) {
		const str = String(line || '').trim();
		if (!str) return null;

		const m = /^(\[[^\]]+\]|[^:]+):(.+)$/.exec(str);
		if (!m) return null;

		const host = m[1].startsWith('[') ? m[1].slice(1, -1) : m[1];
		const [port, user, pass] = m[2].split(':');
		if (!port) return null;

		return { host, port, user: user || '', pass: pass || '' };
	}
}

module.exports = Px6Service;
module.exports.VERSION = VERSION;
module.exports.Px6Error = Px6Error;
