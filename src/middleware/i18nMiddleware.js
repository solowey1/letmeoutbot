/**
 * Middleware для интеграции i18n в Telegraf context
 */
class I18nMiddleware {
	constructor(i18nService, database) {
		this.i18nService = i18nService;
		this.database = database;
	}

	/**
     * Middleware функция для Telegraf
     */
	middleware() {
		return async (ctx, next) => {
			// Получаем пользователя из БД
			const user = await this.database.getUser(ctx.from?.id);

			// Определяем язык
			let locale;
			if (user && user.language) {
				// Если у пользователя сохранён язык, используем его
				locale = user.language;
			} else {
				// Иначе определяем по языку Telegram
				locale = this.i18nService.detectUserLanguage(ctx);

				// Сохраняем определённый язык в БД если пользователь существует
				if (user) {
					await this.database.updateUser(ctx.from.id, { language: locale });
				}
			}

			// Добавляем функции перевода в context
			ctx.i18n = {
				locale: locale,
				t: (key, params) => this.i18nService.t(ctx.i18n.locale, key, params),
				setLocale: async (newLocale) => {
					if (this.i18nService.isSupported(newLocale)) {
						ctx.i18n.locale = newLocale;
						await this.database.updateUser(ctx.from.id, { language: newLocale });
						return true;
					}
					return false;
				}
			};

			await next();
		};
	}
}

module.exports = I18nMiddleware;
