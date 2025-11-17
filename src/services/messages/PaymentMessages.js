/**
 * Сервис для генерации сообщений меню, помощи и настроек
 */
class PaymentMessages {
	/**
	 * Формирование чека
	 * @param {Function} t - Функция перевода
	 * @param {Object} plan - Данные о тарифе
	 * @param {Object} payment - Объект платежа
	 * @param {Object} key - Данные о ключе
	 * @returns {string}
	 */
	static generateReceipt(t, locale, plan, payment, key) {
		return [
			`🧾 <b>${t('payments.receipt.title', { ns: 'message' })}</b>`,
			'',
			`🧾 <b>${t('payments.receipt.details', { ns: 'message' })}</b>`,
			`• ${t('common.plan')}: ${plan.name}`,
			`• ${t('common.limit')}: ${this.formatDataLimit(plan.dataLimit)}`,
			`• ${t('common.period')}: ${this.formatDuration(plan.duration)}`,
			'',
			`💰 <b>${t('common.payment')}:</b>`,
			`• ${t('common.amount')}: ${this.formatStarsAmount(payment.amount)}`,
			`• ${t('common.status')}: ${t('common.statuses.payment.success')}`,
			`• ${t('common.date')}: ${new Date(payment.created_at).toLocaleString(locale)}`,
			'',
			`🔑 <b>${t('payments.receipt.vpn_key', { ns: 'message' })}</b>`,
			`• ${t('common.status')}: ${t('common.statuses.vpn.active')}`,
			`• ${t('common.valid_until')}: ${new Date(key.expires_at).toLocaleString(locale)}`,
			'',
			t('payments.receipt.thanks', { ns: 'message' }),
		].join('\n');
	}
}

module.exports = PaymentMessages;
