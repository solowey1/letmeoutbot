const { PLANS } = require('../config/constants');
const moment = require('moment');

class PlanService {

	/**
	 * Получить все видимые платные VPN-планы (единая тарифная сетка)
	 * @param {boolean} includeHidden - включать тестовые/подарочные планы
	 */
	static getPlans(includeHidden = false) {
		return Object.values(PLANS).filter(p =>
			p.type === 'vless' &&
			p.price > 0 &&
			!p.disabled &&
			(includeHidden || !p.hidden)
		);
	}

	/**
	 * Получить все видимые платные тарифы на MTProto-прокси
	 * @param {boolean} includeHidden - включать тестовые/подарочные планы
	 */
	static getProxyPlans(includeHidden = false) {
		return Object.values(PLANS).filter(p =>
			p.type === 'mtproto' &&
			p.price > 0 &&
			!p.disabled &&
			(includeHidden || !p.hidden)
		);
	}

	/**
	 * Получить все видимые планы (для пользователя)
	 */
	static getAllPlans(includeHidden = false) {
		return Object.values(PLANS).filter(p => includeHidden || !p.hidden);
	}

	static getPlanById(planId) {
		return Object.values(PLANS).find(p => p.id === planId) || null;
	}

	static formatPlanPrice(price) {
		return `${price} ⭐`;
	}

	static formatDataLimit(t, bytes) {
		if (!bytes || bytes === 0) return t ? t('plans.unlimited') || 'Безлимит' : 'Безлимит';
		const gb = bytes / (1024 * 1024 * 1024);
		const mb = bytes / (1024 * 1024);
		if (gb >= 1) return `${gb.toFixed(0)} ${t ? t('common.memory.gb') : 'GB'}`;
		return `${mb.toFixed(0)} ${t ? t('common.memory.mb') : 'MB'}`;
	}

	static getPlural(n, form1, form2, form5 = '') {
		if (!form5) form5 = form2;
		const nAbs = Math.abs(n) % 100;
		const n1 = n % 10;
		if (nAbs > 10 && nAbs < 20) return form5;
		if (n1 > 1 && n1 < 5) return form2;
		if (n1 === 1) return form1;
		return form5;
	}

	/**
	 * Срок строго в днях («7 дней», «30 дней», «90 дней») —
	 * используется для MTProto-прокси
	 */
	static formatDurationDays(t, days) {
		return `${days} ${this.getPlural(days,
			t('common.periods.day.one'),
			t('common.periods.day.some'),
			t('common.periods.day.many')
		)}`;
	}

	static formatDuration(t, days) {
		if (days >= 365) {
			const years = Math.floor(days / 365);
			return `${years} ${this.getPlural(years,
				t('common.periods.year.one'),
				t('common.periods.year.some'),
				t('common.periods.year.many')
			)}`;
		} else if (days >= 30) {
			const months = Math.floor(days / 30);
			return `${months} ${this.getPlural(months,
				t('common.periods.month.one'),
				t('common.periods.month.some'),
				t('common.periods.month.many')
			)}`;
		} else if (days >= 7 && days % 7 === 0) {
			const weeks = days / 7;
			return `${weeks} ${this.getPlural(weeks,
				t('common.periods.week.one'),
				t('common.periods.week.some'),
				t('common.periods.week.many')
			)}`;
		}
		return `${days} ${this.getPlural(days,
			t('common.periods.day.one'),
			t('common.periods.day.some'),
			t('common.periods.day.many')
		)}`;
	}

	static calculateExpiryDate(plan) {
		return moment().add(plan.duration, 'days').toDate();
	}

	/**
	 * Отформатировать план для отображения
	 */
	static formatPlanForDisplay(t, plan) {
		const dataLimitFormatted = this.formatDataLimit(t, plan.dataLimit);
		// У прокси срок всегда в днях (7/30/90 дней), у VPN — недели/месяцы
		const durationFormatted = plan.type === 'mtproto'
			? this.formatDurationDays(t, plan.duration)
			: this.formatDuration(t, plan.duration);
		const priceFormatted = this.formatPlanPrice(plan.price);

		// Получаем локализованные описание и invoice
		// Если ключа нет — используем дефолтные строки
		let description, invoice;
		try {
			description = t(`plans.${plan.id}.description`);
		} catch {
			description = plan.name;
		}
		try {
			invoice = t(`plans.${plan.id}.invoice`);
		} catch {
			invoice = `${plan.name} — ${dataLimitFormatted} / ${durationFormatted}`;
		}

		// Если t вернул ключ (перевод не найден) — используем дефолт
		if (description === `plans.${plan.id}.description`) {
			description = plan.name;
		}
		if (invoice === `plans.${plan.id}.invoice`) {
			invoice = `${plan.name} — ${dataLimitFormatted} / ${durationFormatted}`;
		}

		// У прокси нет объёма данных — в списках показываем срок, а не «Безлимит»
		const displayName = plan.type === 'mtproto'
			? durationFormatted
			: dataLimitFormatted;

		return {
			...plan,
			description,
			invoice,
			displayName,
			displayDescription: `${dataLimitFormatted} / ${durationFormatted}`,
			displayDataLimit: dataLimitFormatted,
			displayDuration: durationFormatted,
			displayPrice: priceFormatted,
			fullDescription: `${description}\n💾 ${dataLimitFormatted}\n⏰ ${durationFormatted}\n💰 ${priceFormatted}`
		};
	}

	/**
	 * Проставить лимит трафика в байтах, синхронизировав производное поле GB.
	 * @param {object} plan
	 * @param {number} bytes - 0 = безлимит
	 */
	static applyDataLimit(plan, bytes) {
		plan.dataLimit = bytes;
		plan.dataLimitGB = bytes > 0 ? Math.round(bytes / (1024 * 1024 * 1024)) : 0;
	}

	static async loadPrices(db) {
		try {
			const rows = await db.getPlanPrices();
			for (const { id, price, enabled, data_limit, duration } of rows) {
				const plan = Object.values(PLANS).find(p => p.id === id);
				if (!plan) continue;
				if (price !== null && price !== undefined) plan.price = price;
				if (data_limit !== null && data_limit !== undefined) this.applyDataLimit(plan, Number(data_limit));
				if (duration !== null && duration !== undefined) plan.duration = duration;
				// disabled — выключение из админки; hidden — служебные тарифы
				// (тестовый, подарочные), их видимость задана в коде.
				plan.disabled = enabled === false;
			}
			console.log('✅ Тарифы загружены из БД');
		} catch (error) {
			console.error('⚠️ Не удалось загрузить тарифы из БД, используются значения по умолчанию:', error.message);
		}
	}

	/**
	 * Досоздать в БД строки для тарифов, которых там ещё нет, чтобы админка
	 * и сайт видели полный список. Существующие цены не перезаписываются.
	 */
	static async syncPlansToDb(db) {
		if (typeof db.upsertMissingPlans !== 'function') return;
		try {
			await db.upsertMissingPlans(Object.values(PLANS));
		} catch (error) {
			console.error('⚠️ Не удалось синхронизировать тарифы в БД:', error.message);
		}
	}

	/**
	 * Все тарифы продукта для админки — включая выключенные и служебные.
	 * @param {string} type - 'vless' | 'mtproto'
	 */
	static getPlansForAdmin(type) {
		return Object.values(PLANS).filter(p => p.type === type);
	}

	static validatePlanData(planData) {
		const requiredFields = ['id', 'name', 'type', 'duration', 'price'];
		for (const field of requiredFields) {
			if (!planData[field]) throw new Error(`Missing required field: ${field}`);
		}
		if (planData.price <= 0) throw new Error('Price must be > 0');
		if (planData.duration <= 0) throw new Error('Duration must be > 0');
		return true;
	}
}

module.exports = PlanService;
