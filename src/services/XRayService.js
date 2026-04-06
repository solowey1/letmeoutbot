const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Сервис для работы с 3X-UI API
 * Сервер: 45.145.163.170 (let-me-out.com)
 * Протокол: VLESS + Reality
 */
class XRayService {
	constructor(panelUrl, username, password, twoFactorSecret, publicKey) {
		this.panelUrl = panelUrl;
		this.username = username;
		this.password = password;
		this.twoFactorSecret = twoFactorSecret;
		this.sessionCookie = null;
		this.sessionExpiry = null;

		this.REALITY_INBOUND_ID = 1;

		this.REALITY_CONFIG = {
			address: 'let-me-out.com',
			port: 56867,
			pbk: publicKey,
			sid: 'e3',
			sni: 'www.google.com',
			fp: 'chrome',
			flow: 'xtls-rprx-vision',
			type: 'tcp',
			security: 'reality'
		};
	}

	getTotpCode() {
		if (!this.twoFactorSecret) return null;
		try {
			const { authenticator } = require('otplib');
			return authenticator.generate(this.twoFactorSecret);
		} catch (e) {
			console.error('otplib не установлен: npm install otplib');
			return null;
		}
	}

	async login() {
		const body = { username: this.username, password: this.password };
		const totpCode = this.getTotpCode();
		if (totpCode) body.twoFactorCode = totpCode;

		const response = await axios.post(`${this.panelUrl}/login`, body, {
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.data.success) {
			throw new Error(`3X-UI login failed: ${response.data.msg}`);
		}

		const setCookie = response.headers['set-cookie'];
		if (setCookie) {
			this.sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
			this.sessionExpiry = Date.now() + 23 * 60 * 60 * 1000;
		}

		console.log('✅ 3X-UI: авторизация успешна');
		return true;
	}

	async ensureSession() {
		if (!this.sessionCookie || Date.now() >= this.sessionExpiry) {
			await this.login();
		}
	}

	async apiRequest(method, path, data = null) {
		await this.ensureSession();

		const url = `${this.panelUrl}/panel/api${path}`;
		const config = {
			method,
			url,
			headers: { 'Cookie': this.sessionCookie, 'Content-Type': 'application/json' }
		};
		if (data) config.data = data;

		try {
			const response = await axios(config);
			if (!response.data.success) {
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
			console.error(`❌ 3X-UI API ${method} ${url} → ${error.response?.status || error.message}`);
			throw error;
		}
	}

	async addClient(inboundId, clientData) {
		return this.apiRequest('POST', '/inbounds/addClient', {
			id: inboundId,
			settings: JSON.stringify({ clients: [clientData] })
		});
	}

	async updateClient(inboundId, uuid, clientData) {
		return this.apiRequest('POST', `/inbounds/updateClient/${uuid}`, {
			id: inboundId,
			settings: JSON.stringify({ clients: [clientData] })
		});
	}

	async deleteClient(inboundId, uuid) {
		return this.apiRequest('POST', `/inbounds/${inboundId}/delClient/${uuid}`);
	}

	async getClientStats(email) {
		return this.apiRequest('GET', `/inbounds/getClientTraffics/${encodeURIComponent(email)}`);
	}

	/**
	 * Создать VLESS Reality клиента
	 * @param {string} email - уникальный идентификатор (lmo_{telegramId}_{ts})
	 * @param {number} totalGB - лимит в GB (0 = безлимит)
	 * @param {number} expiryTime - unix ms (0 = никогда)
	 */
	async createRealityClient(email, totalGB = 0, expiryTime = 0, tgId = '') {
		const uuid = uuidv4();
		const subId = this._generateSubId();

		await this.addClient(this.REALITY_INBOUND_ID, {
			id: uuid,
			email,
			enable: true,
			flow: 'xtls-rprx-vision',
			limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime,
			reset: 0,
			subId,
			tgId: String(tgId),
			comment: 'LetMeOut Bot'
		});

		return { uuid, subId, accessUrl: this._buildRealityUrl(uuid, email), email, type: 'reality' };
	}

	async deleteRealityClient(uuid) {
		return this.deleteClient(this.REALITY_INBOUND_ID, uuid);
	}

	async getClientDataUsage(email) {
		try {
			const stats = await this.getClientStats(email);
			if (!stats) return 0;
			return (stats.up || 0) + (stats.down || 0);
		} catch {
			return 0;
		}
	}

	async updateClientLimits(uuid, email, totalGB, expiryTime) {
		return this.updateClient(this.REALITY_INBOUND_ID, uuid, {
			id: uuid, email, enable: true,
			flow: 'xtls-rprx-vision', limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime, reset: 0
		});
	}

	async suspendClient(uuid, email) {
		return this.updateClient(this.REALITY_INBOUND_ID, uuid, {
			id: uuid, email, enable: false,
			flow: 'xtls-rprx-vision', limitIp: 0,
			totalGB: 1, expiryTime: 1, reset: 0
		});
	}

	async reactivateClient(uuid, email, totalGB, expiryTime) {
		return this.updateClient(this.REALITY_INBOUND_ID, uuid, {
			id: uuid, email, enable: true,
			flow: 'xtls-rprx-vision', limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime, reset: 0
		});
	}

	_buildRealityUrl(uuid, name) {
		const c = this.REALITY_CONFIG;
		const params = new URLSearchParams({
			type: c.type, encryption: 'none', security: c.security,
			pbk: c.pbk, sid: c.sid, sni: c.sni,
			fp: c.fp, flow: c.flow, spx: '/'
		});
		return `vless://${uuid}@${c.address}:${c.port}?${params.toString()}#${encodeURIComponent(name)}`;
	}

	_generateSubId() {
		return Math.random().toString(36).substring(2, 18);
	}

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

	static generateClientEmail(telegramId) {
		const ts = Date.now().toString(36);
		return `lmo_${telegramId}_${ts}`;
	}
}

module.exports = XRayService;
