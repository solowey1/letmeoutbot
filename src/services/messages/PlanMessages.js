/**
 * Сервис для генерации сообщений о планах и оплате
 */
class PlanMessages {
	/**
	 * Выбор плана
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static choosePlan(t) {
		return [
			`💎 <b>${t('plans.choose', { ns: 'message' })}</b>`,
			'',
			t('plans.checkout_hint', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Детали плана (страница оформления)
	 * @param {Function} t - Функция перевода
	 * @param {Object} plan - Данные плана
	 * @param {Object} formatted - Отформатированные данные плана
	 * @returns {string}
	 */
	static planDetails(t, plan, formatted) {
		const message = [
			`<b>${t('payment.checkout_title', { ns: 'message' })}</b>`,
			'',
			`📦 <b>${formatted.displayName}</b>`,
			'',
			`<b>${t('plans.whats_included', { ns: 'message' })}</b>`,
			`• ${t('plans.data_volume', { ns: 'message' })}: ${formatted.dataLimit}`,
			`• ${t('plans.validity_period', { ns: 'message' })}: ${formatted.duration}`,
			`• ${t('plans.unlimited_speed', { ns: 'message' })}`,
			`• ${t('plans.all_devices', { ns: 'message' })}`,
			`• ${t('plans.support', { ns: 'message' })}`,
		];

		// Если есть экономия (для больших планов)
		if (formatted.savings) {
			message.push('');
			message.push(`💰 ${t('plans.savings', { ns: 'message' })}: ${formatted.savings}`);
		}

		message.push('');
		message.push(`<b>${t('plans.price', { ns: 'message' })}:</b> ${formatted.displayPrice}`);
		message.push('');
		message.push(t('payment.after_payment', { ns: 'message' }));
		message.push(`<i>${t('payment.via_stars', { ns: 'message' })}</i>`);

		return message.join('\n');
	}

	/**
	 * Инвойс отправлен
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static invoiceSent(t) {
		return `✅ ${t('payment.invoice_sent', { ns: 'message' })}`;
	}

	/**
	 * Успешная оплата
	 * @param {Function} t - Функция перевода
	 * @param {string} accessUrl - URL ключа доступа
	 * @returns {string}
	 */
	static paymentSuccess(t, accessUrl) {
		const message = [
			`🎉 <b>${t('payment.success_title', { ns: 'message' })}</b>`,
			'',
			`✅ ${t('payment.key_activated', { ns: 'message' })}`,
			'',
			`<b>🔑 ${t('keys.access_key_title', { ns: 'message' })}</b>`,
			`<code>${accessUrl}</code>`,
			'',
			`<b>${t('payment.connect_instructions', { ns: 'message' })}</b>`,
			...t('payment.connect_steps', { ns: 'message' }).map((step, i) => `${i + 1}. ${step}`),
			'',
			t('keys.check_stats_hint', { ns: 'message' })
		];

		return message.join('\n');
	}

	/**
	 * Ошибка оплаты
	 * @param {Function} t - Функция перевода
	 * @param {string} errorMessage - Сообщение об ошибке
	 * @returns {string}
	 */
	static paymentError(t, errorMessage = null) {
		const message = [t('payment.failed', { ns: 'error' })];

		if (errorMessage) {
			message.push('');
			message.push(`<i>${errorMessage}</i>`);
		}

		return message.join('\n');
	}

	/**
	 * Ошибка активации ключа
	 * @param {Function} t - Функция перевода
	 * @param {string} error - Описание ошибки
	 * @returns {string}
	 */
	static keyActivationError(t, error) {
		return t('key.activation_failed', { ns: 'error', error });
	}
}

module.exports = PlanMessages;
