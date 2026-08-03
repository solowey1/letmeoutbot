/**
 * Глобальные настройки бота, редактируемые из админки.
 *
 * Значения лежат в таблице bot_settings и кэшируются в памяти: их читают
 * на каждой покупке, ходить в БД каждый раз незачем. Кэш обновляется при
 * записи из админки и при старте бота.
 *
 * Методы работы с настройками реализованы только в SupabaseDatabase
 * (боевая БД) — как и getPlanPrices. На sqlite/postgres сервис молча
 * откатывается на значения по умолчанию, а не роняет бота.
 */
class SettingsService {
	// Тип значения выводится из типа значения по умолчанию (boolean/number)
	static DEFAULTS = {
		vpn_sales_enabled: true,
		proxy_sales_enabled: true,
		// Прокси px6 — отдельный продукт со своим выключателем: свой
		// MTProto-прокси и перепродажа px6 включаются независимо.
		// По умолчанию выключено: нужен PX6_API_KEY.
		px6_sales_enabled: false
	};

	constructor(database) {
		this.db = database;
		this.cache = { ...SettingsService.DEFAULTS };
	}

	static parse(key, raw) {
		return typeof SettingsService.DEFAULTS[key] === 'boolean'
			? raw === 'true'
			: Number(raw);
	}

	async load() {
		if (typeof this.db.getSettings !== 'function') {
			console.warn('⚠️ БД не поддерживает bot_settings — используются значения по умолчанию');
			return;
		}
		try {
			const rows = await this.db.getSettings();
			for (const { key, value } of rows) {
				if (!(key in this.cache)) continue;
				const parsed = SettingsService.parse(key, value);
				// Битое значение в БД не должно затирать разумный дефолт
				if (typeof parsed === 'number' && !Number.isFinite(parsed)) continue;
				this.cache[key] = parsed;
			}
			console.log('✅ Настройки бота загружены из БД');
		} catch (error) {
			console.error('⚠️ Не удалось загрузить настройки, используются значения по умолчанию:', error.message);
		}
	}

	get(key) {
		return this.cache[key];
	}

	async set(key, value) {
		if (!(key in SettingsService.DEFAULTS)) throw new Error(`Неизвестная настройка: ${key}`);
		if (typeof this.db.setSetting !== 'function') throw new Error('БД не поддерживает bot_settings');
		await this.db.setSetting(key, value);
		this.cache[key] = value;
	}

	async toggle(key) {
		const next = !this.get(key);
		await this.set(key, next);
		return next;
	}

	/**
	 * Разрешена ли сейчас продажа продукта.
	 * @param {string} planType - 'vless' | 'mtproto' | 'px6'
	 */
	isSalesEnabled(planType) {
		if (planType === 'mtproto') return this.get('proxy_sales_enabled');
		if (planType === 'px6') return this.get('px6_sales_enabled');
		return this.get('vpn_sales_enabled');
	}
}

module.exports = SettingsService;
