const KeyboardUtils = require('../../utils/keyboards');
const { MenuMessages } = require('../../services/messages');
const { ADMIN_IDS } = require('../../config/constants');

class CommandHandlers {
	constructor(database) {
		this.db = database;
	}

	async handleStart(ctx) {
		const telegramId = ctx.from.id;
		const username = ctx.from.username;
		const firstName = ctx.from.first_name;
		const lastName = ctx.from.last_name;

		// Создаем или обновляем пользователя
		let user = await this.db.getUser(telegramId);

		if (!user) {
			await this.db.createUser(telegramId, username, firstName, lastName);
			user = await this.db.getUser(telegramId);

			// Сохраняем определённый middleware'ом язык для нового пользователя
			if (ctx.i18n?.locale) {
				await this.db.updateUser(telegramId, { language: ctx.i18n.locale });
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
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			const t = ctx.i18n.t;
			await ctx.reply(t('errors.no_admin_access'));
			return;
		}

		const t = ctx.i18n.t;
		const message = '⚙️ <b>' + t('admin.panel_title') + '</b>\n\n' + t('admin.choose_section');
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
				await ctx.reply(t('errors.generic'));
			}
		});

		bot.help(async (ctx) => {
			try {
				await this.handleHelp(ctx);
			} catch (error) {
				console.error('Ошибка в команде /help:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('errors.generic'));
			}
		});

		bot.command('admin', async (ctx) => {
			try {
				await this.handleAdmin(ctx);
			} catch (error) {
				console.error('Ошибка в команде /admin:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('errors.admin_panel'));
			}
		});
	}
}

module.exports = CommandHandlers;
