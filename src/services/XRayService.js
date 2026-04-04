const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Сервис для работы с 3X-UI API (VLESS через WebSocket + Reality)
 */
class XRayService {
	constructor(panelUrl, username, password, twoFactorSecret = null) {
		// panelUrl = https://vpn.solowey.ru/nAmKWVWzelWeII6aKa
		this.panelUrl = panelUrl.replace(/\/$/, '');
		this.username = username;
		this.password = password;
		this.twoFactorSecret = twoFactorSecret; // TOTP secret для 2FA
		this.sessionCookie = null;
		this.sessionExpiry = null;

		// ID inbound-ов (из API)
		this.WS_INBOUND_ID = 2;       // VLESS + WebSocket → free.solowey.ru:443
		this.REALITY_INBOUND_ID = 3;   // VLESS + Reality → vpn.solowey.ru:8443

		// Параметры подключения для генерации ссылок
		this.WS_CONFIG = {
			address: 'free.solowey.ru',
			port: 443,
			path: '/vless',
			host: 'free.solowey.ru',
			security: 'tls',
			sni: 'free.solowey.ru',
			fp: 'chrome',
			type: 'ws'
		};

		this.REALITY_CONFIG = {
			address: 'vpn.solowey.ru',
			port: 8443,
			pbk: 'IIQu0Q9JH2s6fhcJXmWIbSopAUkUUN7sYZJLlKJod3A',
			sid: '744ae6854a8be3fb',
			sni: 'www.microsoft.com',
			fp: 'chrome',
			flow: 'xtls-rprx-vision',
			type: 'tcp',
			security: 'reality'
		};
	}

	// ============== AUTH ==============

	/**
	 * Получить TOTP код если настроен 2FA
	 * Требует пакет 'totp-generator' или 'otplib'
	 */
	getTotpCode() {
		if (!this.twoFactorSecret) return null;
		try {
			const { authenticator } = require('otplib');
			return authenticator.generate(this.twoFactorSecret);
		} catch (e) {
			console.error('otplib не установлен. Установите: npm install otplib');
			return null;
		}
	}

	/**
	 * Авторизоваться в панели и сохранить cookie сессии
	 */
	async login() {
		const body = {
			username: this.username,
			password: this.password
		};

		// Добавляем 2FA код если настроен
		const totpCode = this.getTotpCode();
		if (totpCode) {
			body.twoFactorCode = totpCode;
		}

		const response = await axios.post(`${this.panelUrl}/login`, body, {
			headers: { 'Content-Type': 'application/json' },
			withCredentials: true
		});

		if (!response.data.success) {
			throw new Error(`3X-UI login failed: ${response.data.msg}`);
		}

		// Сохраняем Set-Cookie заголовок
		const setCookie = response.headers['set-cookie'];
		if (setCookie) {
			this.sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
			// Сессия живёт ~24 часа, обновляем через 23
			this.sessionExpiry = Date.now() + 23 * 60 * 60 * 1000;
		}

		console.log('✅ 3X-UI: авторизация успешна');
		return true;
	}

	/**
	 * Убедиться что сессия активна, при необходимости перелогиниться
	 */
	async ensureSession() {
		if (!this.sessionCookie || Date.now() >= this.sessionExpiry) {
			await this.login();
		}
	}

	/**
	 * Выполнить авторизованный запрос к API
	 */
	async apiRequest(method, path, data = null) {
		await this.ensureSession();

		const config = {
			method,
			url: `${this.panelUrl}/panel/api${path}`,
			headers: {
				'Cookie': this.sessionCookie,
				'Content-Type': 'application/json'
			}
		};

		if (data) config.data = data;

		try {
			const response = await axios(config);

			if (!response.data.success) {
				// Сессия протухла — переавторизуемся и повторим
				if (response.data.msg?.includes('login') || response.status === 401) {
					this.sessionCookie = null;
					await this.ensureSession();
					return this.apiRequest(method, path, data);
				}
				throw new Error(`API error: ${response.data.msg}`);
			}

			return response.data.obj;
		} catch (error) {
			if (error.response?.status === 401) {
				this.sessionCookie = null;
				await this.ensureSession();
				return this.apiRequest(method, path, data);
			}
			throw error;
		}
	}

	// ============== CLIENTS ==============

	/**
	 * Добавить клиента в inbound
	 * @param {number} inboundId - ID inbound
	 * @param {Object} clientData - Данные клиента
	 */
	async addClient(inboundId, clientData) {
		return this.apiRequest('POST', '/inbounds/addClient', {
			id: inboundId,
			settings: JSON.stringify({
				clients: [clientData]
			})
		});
	}

	/**
	 * Обновить клиента
	 */
	async updateClient(inboundId, uuid, clientData) {
		return this.apiRequest('POST', `/inbounds/updateClient/${uuid}`, {
			id: inboundId,
			settings: JSON.stringify({
				clients: [clientData]
			})
		});
	}

	/**
	 * Удалить клиента из inbound
	 */
	async deleteClient(inboundId, uuid) {
		return this.apiRequest('POST', `/inbounds/${inboundId}/delClient/${uuid}`);
	}

	/**
	 * Получить статистику клиента по email
	 */
	async getClientStats(email) {
		return this.apiRequest('GET', `/inbounds/getClientTraffics/${email}`);
	}

	/**
	 * Сбросить трафик клиента
	 */
	async resetClientTraffic(inboundId, email) {
		return this.apiRequest('POST', `/inbounds/${inboundId}/resetClientTraffic/${email}`);
	}

	// ============== KEY CREATION ==============

	/**
	 * Создать VLESS WS клиента
	 * @param {string} email - Уникальный email клиента
	 * @param {number} totalGB - Лимит трафика в GB (0 = безлимит)
	 * @param {number} expiryTime - Unix timestamp истечения (0 = никогда)
	 * @returns {Object} { uuid, accessUrl, subId }
	 */
	async createWsClient(email, totalGB = 0, expiryTime = 0) {
		const uuid = uuidv4();
		const subId = this._generateSubId();

		const clientData = {
			id: uuid,
			email,
			enable: true,
			flow: '',
			limitIp: 0,
			totalGB: totalGB * 1024 * 1024 * 1024, // конвертируем GB в байты
			expiryTime: expiryTime, // unix ms
			reset: 0,
			subId,
			tgId: '',
			comment: 'LetMeOut Bot'
		};

		await this.addClient(this.WS_INBOUND_ID, clientData);

		const accessUrl = this._buildWsUrl(uuid, email);

		return { uuid, subId, accessUrl, type: 'ws' };
	}

	/**
	 * Создать VLESS Reality клиента
	 * @param {string} email - Уникальный email клиента
	 * @param {number} totalGB - Лимит трафика в GB (0 = безлимит)
	 * @param {number} expiryTime - Unix timestamp истечения (0 = никогда)
	 * @returns {Object} { uuid, accessUrl, subId }
	 */
	async createRealityClient(email, totalGB = 0, expiryTime = 0) {
		const uuid = uuidv4();
		const subId = this._generateSubId();

		const clientData = {
			id: uuid,
			email,
			enable: true,
			flow: 'xtls-rprx-vision',
			limitIp: 0,
			totalGB: totalGB * 1024 * 1024 * 1024,
			expiryTime: expiryTime,
			reset: 0,
			subId,
			tgId: '',
			comment: 'LetMeOut Bot'
		};

		await this.addClient(this.REALITY_INBOUND_ID, clientData);

		const accessUrl = this._buildRealityUrl(uuid, email);

		return { uuid, subId, accessUrl, type: 'reality' };
	}

	/**
	 * Удалить WS клиента
	 */
	async deleteWsClient(uuid) {
		return this.deleteClient(this.WS_INBOUND_ID, uuid);
	}

	/**
	 * Удалить Reality клиента
	 */
	async deleteRealityClient(uuid) {
		return this.deleteClient(this.REALITY_INBOUND_ID, uuid);
	}

	/**
	 * Получить использование трафика клиента (байты)
	 */
	async getClientDataUsage(email) {
		try {
			const stats = await this.getClientStats(email);
			if (!stats) return 0;
			return (stats.up || 0) + (stats.down || 0);
		} catch (e) {
			return 0;
		}
	}

	/**
	 * Обновить лимит трафика и срок действия клиента
	 */
	async updateClientLimits(inboundId, uuid, email, totalGB, expiryTime) {
		const clientData = {
			id: uuid,
			email,
			enable: true,
			limitIp: 0,
			totalGB: totalGB > 0 ? totalGB * 1024 * 1024 * 1024 : 0,
			expiryTime,
			reset: 0
		};

		// flow только для Reality
		if (inboundId === this.REALITY_INBOUND_ID) {
			clientData.flow = 'xtls-rprx-vision';
		} else {
			clientData.flow = '';
		}

		return this.updateClient(inboundId, uuid, clientData);
	}

	/**
	 * Заблокировать клиента (установить лимит = 1 байт)
	 */
	async suspendClient(inboundId, uuid, email) {
		const clientData = {
			id: uuid,
			email,
			enable: false,
			limitIp: 0,
			totalGB: 0,
			expiryTime: 1, // уже истёк
			reset: 0,
			flow: inboundId === this.REALITY_INBOUND_ID ? 'xtls-rprx-vision' : ''
		};

		return this.updateClient(inboundId, uuid, clientData);
	}

	// ============== URL BUILDERS ==============

	_buildWsUrl(uuid, name) {
		const c = this.WS_CONFIG;
		const params = new URLSearchParams({
			type: c.type,
			encryption: 'none',
			path: encodeURIComponent(c.path),
			host: c.host,
			security: c.security,
			fp: c.fp,
			sni: c.sni,
			alpn: 'h2,http/1.1'
		});
		return `vless://${uuid}@${c.address}:${c.port}?${params.toString()}#${encodeURIComponent(name)}`;
	}

	_buildRealityUrl(uuid, name) {
		const c = this.REALITY_CONFIG;
		const params = new URLSearchParams({
			type: c.type,
			encryption: 'none',
			security: c.security,
			pbk: c.pbk,
			sid: c.sid,
			sni: c.sni,
			fp: c.fp,
			flow: c.flow,
			spx: encodeURIComponent('/')
		});
		return `vless://${uuid}@${c.address}:${c.port}?${params.toString()}#${encodeURIComponent(name)}`;
	}

	_generateSubId() {
		return Math.random().toString(36).substring(2, 18);
	}

	// ============== UTILS ==============

	formatBytes(bytes) {
		if (!bytes || bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	calculateUsagePercentage(used, limitBytes) {
		if (!limitBytes || limitBytes === 0) return 0;
		return Math.min(100, Math.round((used / limitBytes) * 100));
	}
}

module.exports = XRayService;
