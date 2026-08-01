const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Сервис для работы с 3X-UI API (v3.x)
 * Клиент всегда выдаётся через подписку (XRAY_SUB_BASE_URL), которая
 * агрегирует все протоколы из XRAY_INBOUNDS (VLESS Reality + XHTTP, Hysteria2, ...)
 * в одну ссылку — выбор протокола на уровне бота не нужен.
 */
class XRayService {
	constructor(panelUrl, apiToken, subBaseUrl, inboundIds = [1]) {
		this.panelUrl = panelUrl;
		this.apiToken = apiToken;
		this.subBaseUrl = subBaseUrl;
		this.inboundIds = inboundIds.length > 0 ? inboundIds : [1];
	}

	async apiRequest(method, path, data = null) {
		const url = `${this.panelUrl}/panel/api${path}`;
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
			if (!response.data.success) {
				throw new Error(`API error: ${response.data.msg}`);
			}
			return response.data.obj;
		} catch (error) {
			console.error(`❌ 3X-UI API ${method} ${url} → ${error.response?.status || error.message}`);
			throw error;
		}
	}

	// ── Низкоуровневые методы ──────────────────────────────────────────────

	async addClient(clientData) {
		return this.apiRequest('POST', '/clients/add', { client: clientData, inboundIds: this.inboundIds });
	}

	async updateClient(email, clientData) {
		return this.apiRequest('POST', `/clients/update/${encodeURIComponent(email)}`, clientData);
	}

	async deleteClient(email) {
		return this.apiRequest('POST', `/clients/del/${encodeURIComponent(email)}`);
	}

	async getClientStats(email) {
		return this.apiRequest('GET', `/clients/traffic/${encodeURIComponent(email)}`);
	}

	// ── Высокоуровневые методы ─────────────────────────────────────────────

	async createRealityClient(email, totalGB = 0, expiryTime = 0, tgId = '') {
		const uuid = uuidv4();
		const subId = this._generateSubId();

		await this.addClient({
			uuid,
			email,
			enable: true,
			flow: '', // пусто: xtls-rprx-vision несовместим с XHTTP-инбаундом
			limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime,
			reset: 0,
			subId,
			tgId: parseInt(tgId) || 0,
			comment: 'LetMeOut Bot'
		});

		if (!this.subBaseUrl) throw new Error('XRAY_SUB_BASE_URL не задан — не могу построить ссылку на подписку');

		return { uuid, subId, accessUrl: this._buildSubUrl(subId), email, type: 'reality' };
	}

	async deleteRealityClient(email) {
		return this.deleteClient(email);
	}

	/**
	 * Продлить клиента: пересоздать с теми же uuid/subId, но новыми лимитами.
	 * Счётчик трафика на панели обнуляется, а vless-ссылка и ссылка
	 * на подписку остаются прежними — пользователю ничего менять не нужно.
	 */
	async renewRealityClient(email, uuid, subId, totalGB = 0, expiryTime = 0, tgId = '') {
		try {
			await this.deleteClient(email);
		} catch {
			// клиента могло уже не быть на панели — не мешаем пересозданию
		}

		await this.addClient({
			uuid,
			email,
			enable: true,
			flow: '',
			limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime,
			reset: 0,
			subId,
			tgId: parseInt(tgId) || 0,
			comment: 'LetMeOut Bot'
		});

		return { uuid, subId, accessUrl: this._buildSubUrl(subId), email, type: 'reality' };
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

	async updateClientLimits(email, totalGB, expiryTime) {
		return this.updateClient(email, {
			email,
			enable: true,
			flow: '',
			limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime,
			reset: 0
		});
	}

	async suspendClient(uuid, email, totalGB = 0, expiryTime = 0) {
		return this.updateClient(email, {
			email,
			enable: false,
			flow: '',
			limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime,
			reset: 0
		});
	}

	async reactivateClient(email, totalGB, expiryTime) {
		return this.updateClient(email, {
			email,
			enable: true,
			flow: '',
			limitIp: 0,
			totalGB: totalGB > 0 ? Math.round(totalGB * 1024 * 1024 * 1024) : 0,
			expiryTime,
			reset: 0
		});
	}

	async getRawClientKeys(subUrl) {
		const response = await axios.get(subUrl, { timeout: 10000 });
		const raw = Buffer.from(response.data.trim(), 'base64').toString('utf8');
		return raw.split('\n').map(l => l.trim()).filter(Boolean);
	}

	// ── Вспомогательные методы ─────────────────────────────────────────────

	_buildSubUrl(subId) {
		return `${this.subBaseUrl}/${subId}`;
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
