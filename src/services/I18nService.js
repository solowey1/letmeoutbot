const path = require('path');
const fs = require('fs');

class I18nService {
    constructor() {
        this.translations = {};
        this.defaultLocale = 'ru';
        this.supportedLocales = ['ru', 'en'];
        this.loadTranslations();
    }

    loadTranslations() {
        const localesDir = path.join(__dirname, '../locales');

        this.supportedLocales.forEach(locale => {
            const filePath = path.join(localesDir, `${locale}.json`);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                this.translations[locale] = JSON.parse(content);
                console.log(`✅ Загружен язык: ${locale}`);
            } catch (error) {
                console.error(`❌ Ошибка загрузки локали ${locale}:`, error.message);
            }
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
     * @param {Object} params - Параметры для подстановки
     * @returns {string} - Переведенная строка
     */
    t(locale, key, params = {}) {
        // Проверяем поддерживается ли локаль
        if (!this.supportedLocales.includes(locale)) {
            locale = this.defaultLocale;
        }

        const keys = key.split('.');
        let translation = this.translations[locale];

        // Навигация по вложенным ключам
        for (const k of keys) {
            if (translation && typeof translation === 'object') {
                translation = translation[k];
            } else {
                console.warn(`⚠️ Перевод не найден для ключа: ${key} (locale: ${locale})`);
                return key;
            }
        }

        // Если перевод - массив, соединяем элементы
        if (Array.isArray(translation)) {
            return translation.join('\n');
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
