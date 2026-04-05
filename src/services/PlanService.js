const { PLANS, KEY_TYPE, COMBO_DISCOUNT } = require('../config/constants');
const moment = require('moment');

class PlanService {

	/**
	 * Получить все планы определённого типа
	 * @param {'outline'|'vless'|'both'} type
	 * @param {boolean} includeHidden - включать тестовые планы
	 */
	static getPlansByType(type, includeHidden = false) {
		return Object.values(PLANS).filter(p =>
			p.type === type &&
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
		const durationFormatted = this.formatDuration(t, plan.duration);
		const priceFormatted = this.formatPlanPrice(plan.price);

		// Получаем локализованные описание и invoice
		// Если ключа нет — используем дефолтные строки
		let description, invoice;
		try {
			description = t(`plans.${plan.id}.description`, { discount: Math.round(COMBO_DISCOUNT * 100) });
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

		return {
			...plan,
			description,
			invoice,
			displayName: `${plan.emoji} ${plan.name}`,
			displayDescription: `${dataLimitFormatted} / ${durationFormatted}`,
			displayDataLimit: dataLimitFormatted,
			displayDuration: durationFormatted,
			displayPrice: priceFormatted,
			fullDescription: `${description}\n💾 ${dataLimitFormatted}\n⏰ ${durationFormatted}\n💰 ${priceFormatted}`
		};
	}

	static calculateSavings(plan) {
		if (plan.type === 'both') {
			const outlinePlan = Object.values(PLANS).find(p =>
				p.type === 'outline' && p.dataLimit === plan.dataLimit && !p.hidden
			);
			const vlessPlan = Object.values(PLANS).find(p =>
				p.type === 'vless' && p.dataLimit === plan.dataLimit
			);
			if (outlinePlan && vlessPlan) {
				const fullPrice = outlinePlan.price + vlessPlan.price;
				return fullPrice - Math.round(fullPrice * (1 - COMBO_DISCOUNT));
			}
		}
		return 0;
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
