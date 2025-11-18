const KeyboardUtils = require('../../utils/keyboards');
const { MenuMessages, AdminMessages, ReferralMessages } = require('../../services/messages');
const { ADMIN_IDS } = require('../../config/constants');
const ReferralService = require('../../services/ReferralService');

class CommandHandlers {
	constructor(database) {
		this.db = database;
		this.referralService = new ReferralService(database);
	}

	async handleStart(ctx) {
		const telegramId = ctx.from.id;
		const username = ctx.from.username;
		const firstName = ctx.from.first_name;
		const lastName = ctx.from.last_name;
		const t = ctx.i18n.t;

		// Проверяем, есть ли реферальный параметр в команде /start
		const startPayload = ctx.startPayload;
		let isNewUser = false;
		let referrerId = null;

		// Создаем или обновляем пользователя
		let user = await this.db.getUser(telegramId);

		if (!user) {
			isNewUser = true;
			await this.db.createUser(telegramId, username, firstName, lastName);
			user = await this.db.getUser(telegramId);

			// Сохраняем определённый middleware'ом язык для нового пользователя
			if (ctx.i18n?.locale) {
				await this.db.updateUser(telegramId, { language: ctx.i18n.locale });
			}

			// Обрабатываем реферальную ссылку для нового пользователя
			if (startPayload) {
				const extractedReferrerId = ReferralService.extractReferrerId(startPayload);

				if (extractedReferrerId && extractedReferrerId !== telegramId) {
					// Получаем информацию о реферере
					const referrer = await this.db.getUser(extractedReferrerId);

					if (referrer) {
						// Создаем реферальную связь
						await this.referralService.createReferral(referrer.id, user.id);
						referrerId = extractedReferrerId;

						// Отправляем приветственное сообщение реферал у
						const referrerName = referrer.first_name || referrer.username || 'пользователя';
						const welcomeMessage = ReferralMessages.welcomeReferral(t, referrerName);

						await ctx.reply(welcomeMessage, {
							parse_mode: 'HTML'
						});
					}
				}
			}
		} else {
			// Обновляем данные пользователя если изменились
			const updates = {};
			if (user.username !== username) updates.username = username;
			if (user.first_name !== firstName) updates.first_name = firstName;
			if (user.last_name !== lastName) updates.last_name = lastName;

			if (Object.keys(updates).length > 0) {
				await this.db.updateUser(telegramId, updates);
			}
		}

		await this.showMainMenu(ctx);
	}

	async handleHelp(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.help(t);
		const keyboard = KeyboardUtils.createHelpKeyboard(t);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	async handleAdmin(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			const message = AdminMessages.accessDenied(t);
			await ctx.reply(message);
			return;
		}

		const message = AdminMessages.adminPanel(t);
		const keyboard = KeyboardUtils.createAdminKeyboard(t);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	async showMainMenu(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.welcome(t);
		const keyboard = KeyboardUtils.createMainMenu(t);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	// Регистрация обработчиков команд в боте
	register(bot) {
		bot.start(async (ctx) => {
			try {
				await this.handleStart(ctx);
			} catch (error) {
				console.error('Ошибка в команде /start:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('generic.default', { ns: 'error' }));
			}
		});

		bot.help(async (ctx) => {
			try {
				await this.handleHelp(ctx);
			} catch (error) {
				console.error('Ошибка в команде /help:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('generic.default', { ns: 'error' }));
			}
		});

		bot.command('admin', async (ctx) => {
			try {
				await this.handleAdmin(ctx);
			} catch (error) {
				console.error('Ошибка в команде /admin:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('admin.default', { ns: 'error' }));
			}
		});
	}
}

module.exports = CommandHandlers;
