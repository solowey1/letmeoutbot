/**
 * Сервис для генерации сообщений о ключах
 */
class KeyMessages {
	/**
	 * Список ключей пользователя
	 * @param {Function} t - Функция перевода
	 * @param {Array} keys - Массив ключей
	 * @returns {string}
	 */
	static myKeys(t, keys) {
		if (!keys || keys.length === 0) {
			return t('keys.no_active', { ns: 'message' });
		}

		return t('keys.active_list', { ns: 'message' });
	}

	/**
	 * Детали ключа
	 * @param {Function} t - Функция перевода
	 * @param {Object} key - Данные ключа
	 * @param {Object} plan - Данные плана
	 * @param {Object} stats - Статистика использования
	 * @returns {string}
	 */
	static keyDetails(t, key, plan, stats = null) {
		const planName = plan?.name || 'Unknown';
		const status = key.status === 'active'
			? t('keys.status_active', { ns: 'message' })
			: t('keys.status_inactive', { ns: 'message' });

		const message = [
			`🔑 <b>${t('keys.details_title', { ns: 'message' })}</b>`,
			'',
			`<b>${t('common.plan')}:</b> ${planName}`,
			`<b>${t('common.status')}:</b> ${status}`,
		];

		// Добавляем статистику если есть
		if (stats) {
			message.push('');
			message.push(`<b>${t('keys.usage_title', { ns: 'message' })}</b>`);
			message.push(`${t('common.used')}: ${this.formatBytes(stats.used)} ${t('common.of')} ${this.formatBytes(stats.limit)}`);
			message.push(`${t('common.remaining')}: ${this.formatBytes(stats.remaining)}`);
		}

		// Добавляем информацию о сроке действия
		if (key.expires_at) {
			const expiryDate = new Date(key.expires_at);
			const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

			message.push('');
			message.push(`<b>${t('common.valid_until')}:</b> ${expiryDate.toLocaleDateString()}`);
			message.push(`<b>${t('keys.days_until_expiry', { ns: 'message' })}:</b> ${daysLeft}`);
		}

		// Добавляем ключ доступа
		if (key.access_url) {
			message.push('');
			if (key.key_type === 'vless') {
				message.push(`<b>${t('keys.subscription_title', { ns: 'message' })}</b>`);
				message.push(`<code>${key.access_url}</code>`);
				message.push('');
				message.push(`💡 ${t('keys.subscription_hint', { ns: 'message' })}`);
				message.push('');
				message.push(`<b>${t('keys.subscription_how_to', { ns: 'message' })}</b>`);
				message.push(...t('keys.subscription_steps', { ns: 'message' }).map((step, i) => `${i + 1}. ${step}`));
			} else {
				message.push(`<b>${t('keys.access_key_title', { ns: 'message' })}</b>`);
				message.push(`<code>${key.access_url}</code>`);
				message.push('');
				message.push(`<b>${t('keys.how_to_connect', { ns: 'message' })}</b>`);
				message.push(...t('keys.connect_steps', { ns: 'message' }).map((step, i) => `${i + 1}. ${step}`));
			}
		}

		return message.join('\n');
	}

	/**
	 * Статистика использования ключа
	 * @param {Function} t - Функция перевода
	 * @param {Object} stats - Статистика
	 * @param {number} daysLeft - Дней до окончания
	 * @returns {string}
	 */
	static keyStats(t, stats, daysLeft) {
		const usagePercent = ((stats.used / stats.limit) * 100).toFixed(1);

		const message = [
			`📊 <b>${t('stats.title', { ns: 'message' })}</b>`,
			'',
			`${t('common.used')}: ${this.formatBytes(stats.used)}`,
			`${t('common.limit')}: ${this.formatBytes(stats.limit)}`,
			`${t('common.remaining')}: ${this.formatBytes(stats.remaining)} (${(100 - usagePercent).toFixed(1)}%)`,
			'',
			`⏱ ${t('common.days_left')}: ${daysLeft}`,
		];

		// Предупреждения
		if (stats.used >= stats.limit) {
			message.push('');
			message.push(`⚠️ ${t('stats.over_limit', { ns: 'message' })}`);
		} else if (usagePercent > 80) {
			message.push('');
			message.push(`⚠️ ${t('stats.warning_traffic', { ns: 'message' })}`);
		}

		if (daysLeft <= 0) {
			message.push(`❌ ${t('stats.key_expired', { ns: 'message' })}`);
		} else if (daysLeft <= 3) {
			message.push(`⚠️ ${t('stats.key_expiring_soon', { ns: 'message' })}`);
		}

		return message.join('\n');
	}

	/**
	 * Невозможно создать ключ
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static creationFailed(t) {
		return t('keys.creation_failed', { ns: 'error' });
	}

	/**
	 * Оплата получена, но ключ не создан (ошибка активации)
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static activationPending(t) {
		return [
			`⚠️ <b>${t('keys.activation_pending.title', { ns: 'message' })}</b>`,
			'',
			t('keys.activation_pending.payment_received', { ns: 'message' }),
			'',
			`🔄 ${t('keys.activation_pending.auto_retry', { ns: 'message' })}`,
			`📧 ${t('keys.activation_pending.will_notify', { ns: 'message' })}`,
			'',
			`💡 ${t('keys.activation_pending.support_hint', { ns: 'message' })}`
		].join('\n');
	}

	/**
	 * Блок значений прокси для ручного ввода в настройках Telegram
	 * (Сервер / Порт / Ключ по-отдельности).
	 * @param {Function} t - Функция перевода
	 * @param {string} accessUrl - Ссылка вида https://t.me/proxy?server=...&port=...&secret=...
	 * @returns {string} HTML-блок или пустая строка, если ссылку не удалось разобрать
	 */
	static proxyManualValues(t, accessUrl) {
		const MTProtoService = require('../MTProtoService');
		const parsed = MTProtoService.parseLink(accessUrl);
		if (!parsed) return '';

		return [
			`⚙️ <b>${t('proxy.manual_title', { ns: 'message' })}</b>`,
			`${t('proxy.server_label', { ns: 'message' })}: <code>${parsed.server}</code>`,
			`${t('proxy.port_label', { ns: 'message' })}: <code>${parsed.port}</code>`,
			`${t('proxy.secret_label', { ns: 'message' })}: <code>${parsed.secret}</code>`
		].join('\n');
	}

	/**
	 * Форматирование байтов в читаемый вид
	 * @param {number} bytes
	 * @returns {string}
	 */
	static formatBytes(bytes) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}

module.exports = KeyMessages;
