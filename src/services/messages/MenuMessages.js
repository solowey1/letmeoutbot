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
			: [`🔹 ${steps || t('common.not_specified', { ns: 'main' })}`];

		return [
			`ℹ️ <b>${t('help.title', { ns: 'message' })}</b>`,
			'',
			...stepsList
		].join('\n');
	}

	/**
	 * Как добавить ключ — инструкция
	 */
	static howToAddKey(t) {
		const steps = t('how_to_add_key.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map((item, i) => `${i + 1}. ${item}`)
			: [`1. ${steps}`];

		return [
			`<b>${t('how_to_add_key.title', { ns: 'message' })}</b>`,
			'',
			...stepsList
		].join('\n');
	}

	/**
	 * Как добавить прокси — инструкция
	 */
	static howToAddProxy(t) {
		const steps = t('proxy.how_to_add.full.steps', { ns: 'message' });
		const stepsList = Array.isArray(steps)
			? steps.map((item, i) => `${i + 1}. ${item}`)
			: [`1. ${steps}`];

		return [
			`<b>${t('proxy.how_to_add.full.title', { ns: 'message' })}</b>`,
			'',
			...stepsList
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

	static maskAddress(address) {
		if (!address || address.length < 12) return address;
		return `${address.slice(0, 6)}···${address.slice(-4)}`;
	}

	/**
	 * Экран настроек TON-кошелька
	 */
	static tonWallet(t, walletAddress) {
		if (!walletAddress) {
			return t('settings.ton_wallet.not_connected', { ns: 'message' });
		}
		const masked = MenuMessages.maskAddress(walletAddress);
		return t('settings.ton_wallet.connected', { ns: 'message', address: masked });
	}

	/**
	 * Подсказка ввода адреса (в режиме ожидания)
	 */
	static tonWalletInputPrompt(t) {
		return t('settings.ton_wallet.input_prompt', { ns: 'message' });
	}
}

module.exports = MenuMessages;
