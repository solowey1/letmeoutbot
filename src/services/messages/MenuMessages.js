/**
 * Сервис для генерации сообщений меню, помощи и настроек
 */
class MenuMessages {
	/**
	 * Главное меню (приветствие)
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static welcome(t) {
		return [
			`<b>${t('welcome.title', { ns: 'message' })}</b>`,
			t('welcome.description', { ns: 'message' }),
			'',
			...t('welcome.steps', { ns: 'message' }),
			'',
			t('welcome.action_text', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Справка (помощь)
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static help(t) {
		return [
			`ℹ️ <b>${t('help.title', { ns: 'message' })}</b>`,
			'',
			...t('help.steps', { ns: 'message' }).map(item => `🔹 ${item}`),
			'',
			`📱 <b>${t('help.action_text.title', { ns: 'message' })}</b>`,
			...t('help.action_text.steps', { ns: 'message' }),
		].join('\n');
	}

	/**
	 * Скачивание приложений
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static downloadApps(t) {
		return [
			`<b>${t('download.apps.title', { ns: 'message' })}</b>`,
			t('download.apps.description', { ns: 'message' }),
			'',
			...t('download.apps.steps', { ns: 'message' }),
			'',
			t('download.apps.action_text', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Поддержка
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static support(t) {
		return [
			`🆘 <b>${t('support.title', { ns: 'message' })}</b>`,
			t('support.description', { ns: 'message' }),
			'',
			...t('support.steps', { ns: 'message' }).map((item, i) => `${i + 1}. ${item}`),
			'',
			`📧 ${t('support.action_text', { ns: 'message' })}`,
		].join('\n');
	}

	/**
	 * Настройки
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static settings(t) {
		return [
			`⚙️ <b>${t('settings.title', { ns: 'message' })}</b>`,
			t('settings.description', { ns: 'message' }),
		].join('\n');
	}

	/**
	 * Язык изменён
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static languageChanged(t) {
		return t('settings.language_changed', { ns: 'message' });
	}
}

module.exports = MenuMessages;
