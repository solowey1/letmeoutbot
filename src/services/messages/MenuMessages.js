/**
 * Сервис для генерации сообщений меню, помощи и настроек
 */
class MenuMessages {
	/**
	 * Главное меню (приветствие)
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
	}

	/**
	 * Справка (помощь)
	 */
	static help(t) {
		const steps = t('help.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map(item => `🔹 ${item}`)
			: [`🔹 ${steps || 'Не указано'}`];

		return [
			`ℹ️ <b>${t('help.title', { ns: 'message' })}</b>`,
			'',
			...stepsList
		].join('\n');
	}

	/**
	 * Как добавить ключ — выбор протокола
	 */
	static howToAddKey(t) {
		return t('how_to_add_key.choose_protocol', { ns: 'message' });
	}

	/**
	 * Как добавить ключ — инструкция для протокола
	 */
	static howToAddKeyProtocol(t, protocol) {
		const steps = t(`how_to_add_key.${protocol}.steps`, { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map((item, i) => `${i + 1}. ${item}`)
			: [`1. ${steps}`];

		return [
			`<b>${t(`how_to_add_key.${protocol}.title`, { ns: 'message' })}</b>`,
			'',
			...stepsList
		].join('\n');
	}

	/**
	 * Приложения для VPN — выбор протокола
	 */
	static vpnApps(t) {
		return t('vpn_apps.choose_protocol', { ns: 'message' });
	}

	/**
	 * Outline — список приложений
	 */
	static outlineApps(t) {
		const steps = t('vpn_apps.outline.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map(item => `•  ${item}`)
			: [steps];

		return [
			`<b>${t('vpn_apps.outline.title', { ns: 'message' })}</b>`,
			t('vpn_apps.outline.description', { ns: 'message' }),
			'',
			...stepsList,
			'',
			t('vpn_apps.outline.action_text', { ns: 'message' })
		].join('\n');
	}

	/**
	 * VLESS — выбор ОС
	 */
	static vlessChooseOs(t) {
		return t('vpn_apps.vless.choose_os', { ns: 'message' });
	}

	/**
	 * VLESS — список приложений для конкретной ОС
	 */
	static vlessApps(t, os) {
		const apps = t(`vpn_apps.vless.${os}.apps`, { ns: 'message' });
		const appsList = Array.isArray(apps)
			? apps.map(item => `•  ${item}`)
			: [apps];

		return [
			`<b>${t(`vpn_apps.vless.${os}.title`, { ns: 'message' })}</b>`,
			'',
			...appsList
		].join('\n');
	}

	/**
	 * Поддержка
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
	 */
	static settings(t) {
		return [
			`⚙️ <b>${t('settings.title', { ns: 'message' })}</b>`,
		].join('\n');
	}

	/**
	 * Изменение языка
	 */
	static languageChanging(t) {
		return t('settings.language_title', { ns: 'message' });
	}

	/**
	 * Язык изменён
	 */
	static languageChanged(t) {
		return t('settings.language_changed', { ns: 'message' });
	}
}

module.exports = MenuMessages;
