const path = require('path');
const fs = require('fs');

class I18nService {
	constructor() {
		this.translations = {};
		this.defaultLocale = 'ru';
		this.defaultNamespace = 'main';
		this.supportedLocales = ['ru', 'en'];
		this.loadTranslations();
	}

	loadTranslations() {
		const localesDir = path.join(__dirname, '../locales');

		this.supportedLocales.forEach(locale => {
			const localePath = path.join(localesDir, locale);

			// Проверяем существует ли папка с языком
			if (!fs.existsSync(localePath)) {
				console.error(`❌ Папка локали не найдена: ${localePath}`);
				return;
			}

			// Инициализируем объект для языка
			this.translations[locale] = {};

			// Читаем все JSON файлы в папке языка
			const files = fs.readdirSync(localePath).filter(file => file.endsWith('.json'));

			files.forEach(file => {
				const namespace = path.basename(file, '.json');
				const filePath = path.join(localePath, file);

				try {
					const content = fs.readFileSync(filePath, 'utf8');
					this.translations[locale][namespace] = JSON.parse(content);
					console.log(`✅ Загружен ${locale}/${namespace}.json`);
				} catch (error) {
					console.error(`❌ Ошибка загрузки ${locale}/${namespace}.json:`, error.message);
				}
			});
		});
	}

	/**
     * Определить язык пользователя из Telegram
     * @param {Object} ctx - Telegraf context
     * @returns {string} - Код языка
     */
	detectUserLanguage(ctx) {
		// Сначала проверяем язык из профиля Telegram
		const telegramLang = ctx.from?.language_code || '';

		// Если язык начинается с 'ru', используем русский
		if (telegramLang.startsWith('ru')) {
			return 'ru';
		}

		// Если язык начинается с 'en', используем английский
		if (telegramLang.startsWith('en')) {
			return 'en';
		}

		// По умолчанию английский для международной аудитории
		return 'en';
	}

	/**
     * Получить перевод по ключу
     * @param {string} locale - Код языка
     * @param {string} key - Ключ перевода (например, 'welcome.title')
     * @param {Object} params - Параметры для подстановки и namespace
     * @returns {string} - Переведенная строка
     */
	t(locale, key, params = {}) {
		// Проверяем поддерживается ли локаль
		if (!this.supportedLocales.includes(locale)) {
			locale = this.defaultLocale;
		}

		// Определяем namespace (по умолчанию 'main')
		const namespace = params.ns || this.defaultNamespace;

		// Проверяем существует ли namespace
		if (!this.translations[locale] || !this.translations[locale][namespace]) {
			console.warn(`⚠️ Namespace не найден: ${namespace} (locale: ${locale})`);
			return key;
		}

		const keys = key.split('.');
		let translation = this.translations[locale][namespace];

		// Навигация по вложенным ключам
		for (const k of keys) {
			if (translation && typeof translation === 'object') {
				translation = translation[k];
			} else {
				console.warn(`⚠️ Перевод не найден для ключа: ${key} (locale: ${locale}, ns: ${namespace})`);
				return key;
			}
		}

		// Если перевод - массив, возвращаем его как есть
		if (Array.isArray(translation)) {
			return translation;
		}

		// Если перевод не строка, возвращаем ключ
		if (typeof translation !== 'string') {
			console.warn(`⚠️ Неверный тип перевода для ключа: ${key}`);
			return key;
		}

		// Подстановка параметров
		return this.interpolate(translation, params);
	}

	/**
     * Подстановка параметров в строку
     * @param {string} str - Строка с плейсхолдерами {{param}}
     * @param {Object} params - Объект с параметрами
     * @returns {string} - Строка с подставленными значениями
     */
	interpolate(str, params) {
		return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			return params[key] !== undefined ? params[key] : match;
		});
	}

	/**
     * Получить список поддерживаемых языков
     * @returns {Array} - Массив кодов языков
     */
	getSupportedLocales() {
		return this.supportedLocales;
	}

	/**
     * Проверить поддерживается ли язык
     * @param {string} locale - Код языка
     * @returns {boolean}
     */
	isSupported(locale) {
		return this.supportedLocales.includes(locale);
	}

	/**
     * Получить название языка
     * @param {string} locale - Код языка
     * @returns {string} - Название с флагом
     */
	getLanguageName(locale) {
		const names = {
			'ru': 'Русский 🇷🇺',
			'en': 'English 🇬🇧'
		};
		return names[locale] || locale;
	}
}

module.exports = I18nService;
