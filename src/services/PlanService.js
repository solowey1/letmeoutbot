const { PLANS } = require('../config/constants');
const moment = require('moment');

class PlanService {
	static getAllPlans(includeTestPlans = false) {
		const plans = Object.values(PLANS);
		if (includeTestPlans) {
			return plans;
		}
		return plans.filter(plan => plan.id !== 'test_100mb');
	}

	static getPlanById(planId) {
		return Object.values(PLANS).find(plan => plan.id === planId);
	}

	static formatPlanPrice(price) {
		return `${price} ⭐`;
	}

	static formatDataLimit(bytes) {
		const mb = bytes / (1024 * 1024);
		const gb = mb / 1024;
        
		if (gb >= 1024) {
			return `${(gb / 1024).toFixed(0)} ТБ`;
		}
		if (gb >= 1) {
			return `${gb.toFixed(0)} ГБ`;
		}
		return `${mb.toFixed(0)} МБ`;
	}

	static getPlural(n, form1, form2, form5 = '') {
		if (!form5) form5 = form2;
		let nAbs = Math.abs(n) % 100;
		let n1 = n % 10;
		if (nAbs > 10 && nAbs < 20) return form5;
		if (n1 > 1 && n1 < 5) return form2;
		if (n1 == 1) return form1;
		return form5;
	}

	static formatDuration(days) {
		if (days >= 365) {
			const years = Math.floor(days / 365);
			return `${years} ${this.getPlural(years, 'год', 'года', 'лет')}`;
		} else if (days >= 30) {
			const months = Math.floor(days / 30);
			return `${months} ${this.getPlural(months, 'месяц', 'месяца', 'месяцев')}`;
		}
		return `${days} ${this.getPlural(days, 'день', 'дня', 'дней')}`;
	}

	static calculateExpiryDate(plan) {
		return moment().add(plan.duration, 'days').toDate();
	}

	static formatPlanForDisplay(plan) {
		const dataLimitFormatted = this.formatDataLimit(plan.dataLimit);
		const durationFormatted = this.formatDuration(plan.duration);
		const priceFormatted = this.formatPlanPrice(plan.price);

		return {
			...plan,
			displayName: `${plan.emoji} ${plan.name}`,
			displayDescription: `${dataLimitFormatted} на ${durationFormatted}`,
			displayPrice: priceFormatted,
			fullDescription: `${plan.description}\n💾 ${dataLimitFormatted}\n⏰ ${durationFormatted}\n💰 ${priceFormatted}`
		};
	}

	static getPlansByPriceRange(minPrice, maxPrice) {
		return Object.values(PLANS).filter(plan => 
			plan.price >= minPrice && plan.price <= maxPrice
		);
	}

	static getRecommendedPlans() {
		// Возвращаем наиболее популярные планы
		return [
			PLANS.BASIC_30GB,
			PLANS.BASIC_100GB,
			PLANS.PREMIUM_250GB
		];
	}

	static calculateSavings(plan) {
		// Расчет экономии по сравнению с базовым планом
		const basePrice = PLANS.BASIC_10GB.price;
		const baseDuration = PLANS.BASIC_10GB.duration;
		const baseDataLimit = PLANS.BASIC_10GB.dataLimit;
        
		const equivalentBaseCost = (plan.duration / baseDuration) * (plan.dataLimit / baseDataLimit) * basePrice;
		const savings = equivalentBaseCost - plan.price;
        
		if (savings > 0) {
			return Math.round(savings);
		}
        
		return 0;
	}

	static isLimitedTimeOffer() {
		// Можно добавить логику для ограниченных предложений
		return false;
	}

	static validatePlanData(planData) {
		const requiredFields = ['id', 'name', 'dataLimit', 'duration', 'price'];
        
		for (const field of requiredFields) {
			if (!planData[field]) {
				throw new Error(`Missing required field: ${field}`);
			}
		}

		if (planData.price <= 0) {
			throw new Error('Price must be greater than 0');
		}

		if (planData.duration <= 0) {
			throw new Error('Duration must be greater than 0');
		}

		if (planData.dataLimit <= 0) {
			throw new Error('Data limit must be greater than 0');
		}

		return true;
	}
}

module.exports = PlanService;