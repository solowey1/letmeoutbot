const axios = require('axios');

/**
 * Сервис для работы с прослойкой mtproto-api (управление секретами
 * многопользовательского MTProto-прокси на ноде).
 * Тот же паттерн, что и XRayService: HTTP + Bearer-токен, JSON.
 */
class MTProtoService {
	constructor(apiUrl, apiToken) {
		this.apiUrl = apiUrl;
		this.apiToken = apiToken;
	}

	async apiRequest(method, path, data = null) {
		const url = `${this.apiUrl}${path}`;
		const config = {
			method,
			url,
			headers: {
				'Authorization': `Bearer ${this.apiToken}`,
				'Content-Type': 'application/json'
			}
		};
		if (data) config.data = data;

		try {
			const response = await axios(config);
			return response.data;
		} catch (error) {
			console.error(`❌ mtproto-api ${method} ${url} → ${error.response?.status || error.message}`);
			throw error;
		}
	}

	/**
	 * Создать (или получить существующего — идемпотентно) пользователя прокси.
	 * @param {string} email - уникальный идентификатор клиента
	 */
	async createUser(email) {
		const result = await this.apiRequest('POST', '/users', { email });
		return {
			email: result.email,
			secret: result.secret,
			accessUrl: result.link,
			tgLink: result.tg_link
		};
	}

	async deleteUser(email) {
		return this.apiRequest('DELETE', `/users/${encodeURIComponent(email)}`);
	}

	/**
	 * tg://-ссылка для inline-кнопки из https-ссылки, сохранённой в БД.
	 */
	static toTgLink(accessUrl) {
		return accessUrl.replace('https://t.me/proxy', 'tg://proxy');
	}

	/**
	 * Разбор ссылки вида https://t.me/proxy?server=...&port=...&secret=...
	 * на отдельные значения для ручного ввода в настройках Telegram.
	 * @returns {{server: string, port: string, secret: string}|null}
	 */
	static parseLink(accessUrl) {
		try {
			const url = new URL(accessUrl.replace('tg://proxy', 'https://t.me/proxy'));
			const server = url.searchParams.get('server');
			const port = url.searchParams.get('port');
			const secret = url.searchParams.get('secret');
			if (!server || !port || !secret) return null;
			return { server, port, secret };
		} catch {
			return null;
		}
	}
}

module.exports = MTProtoService;
