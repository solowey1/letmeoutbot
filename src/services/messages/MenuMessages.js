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
		const steps = t('welcome.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps) ? steps : [steps];

		return [
			`<b>${t('welcome.title', { ns: 'message' })}</b>`,
			t('welcome.description', { ns: 'message' }),
			'',
			...stepsList,
			'',
			t('welcome.action_text', { ns: 'message' })
		].join('\n');
	};

	/**
	 * Справка (помощь)
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static help(t) {
		const steps = t('help.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map(item => `🔹 ${item}`)
			: [`🔹 ${steps || 'Не указано'}`];

		const actionSteps = t('help.action_text.steps', { ns: 'message' });
		const actionStepsList = Array.isArray(actionSteps)
			? actionSteps.map(item => `•  ${item}`)
			: [`•  ${actionSteps || ''}`];

		return [
			`ℹ️ <b>${t('help.title', { ns: 'message' })}</b>`,
			'',
			...stepsList,
			'',
			`📱 <b>${t('help.action_text.title', { ns: 'message' })}</b>`,
			...actionStepsList
		].join('\n');
	}
	

	/**
	 * Скачивание приложений
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static downloadApps(t) {
		const steps = t('download.apps.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map(item => `•  ${item}`)
			: [steps];

		return [
			`<b>${t('download.apps.title', { ns: 'message' })}</b>`,
			t('download.apps.description', { ns: 'message' }),
			'',
			...stepsList,
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
		const steps = t('support.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map((item, i) => `${i + 1}. ${item}`)
			: [`1. ${steps}`];

		return [
			`🆘 <b>${t('support.title', { ns: 'message' })}</b>`,
			t('support.description', { ns: 'message' }),
			'',
			...stepsList,
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
