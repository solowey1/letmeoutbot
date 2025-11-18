const KeyboardUtils = require('../../../utils/keyboards');
const { ReferralMessages } = require('../../../services/messages');
const ReferralService = require('../../../services/ReferralService');
const { ADMIN_IDS } = require('../../../config/constants');
const config = require('../../../config');

class ReferralCallbacks {
	constructor(database, bot) {
		this.db = database;
		this.bot = bot;
		this.referralService = new ReferralService(database);
	}

	/**
	 * Отображение меню реферальной программы
	 */
	async handleReferralMenu(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUser(ctx.from.id);

		// Получаем статистику рефералов
		const stats = await this.referralService.getReferralStats(user.id);

		// Генерируем сообщение
		const message = ReferralMessages.menu(t, stats);
		const keyboard = KeyboardUtils.createReferralMenuKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Кнопка "Пригласить друзей" - открывает нативное меню "Поделиться"
	 */
	async handleInvite(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUser(ctx.from.id);

		// Генерируем реферальную ссылку
		const botInfo = await ctx.telegram.getMe();
		const referralLink = ReferralService.generateReferralLink(botInfo.username, user.id);

		// Текст для приглашения
		const inviteText = ReferralMessages.inviteText(t, referralLink);

		// Используем switchInline для кнопки "Поделиться"
		const keyboard = KeyboardUtils.createReferralInviteKeyboard(t, inviteText);

		const message = t('referral.invite_text', { ns: 'message' });

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Кнопка "Получить ссылку" - отправляет персональную ссылку
	 */
	async handleGetLink(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUser(ctx.from.id);

		// Генерируем реферальную ссылку
		const botInfo = await ctx.telegram.getMe();
		const referralLink = ReferralService.generateReferralLink(botInfo.username, user.id);

		// Генерируем сообщение
		const message = ReferralMessages.referralLink(t, referralLink);
		const keyboard = KeyboardUtils.createReferralBackKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Кнопка "Мои рефералы" - показывает список рефералов
	 */
	async handleMyReferrals(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUser(ctx.from.id);

		// Получаем список рефералов
		const referrals = await this.referralService.getReferrals(user.id);

		// Генерируем сообщение
		const message = ReferralMessages.referralsList(t, referrals);
		const keyboard = KeyboardUtils.createReferralBackKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Кнопка "Вывести средства" - проверяет доступность средств и запрашивает подтверждение
	 */
	async handleWithdraw(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUser(ctx.from.id);

		// Получаем статистику рефералов
		const stats = await this.referralService.getReferralStats(user.id);

		// Проверяем, можно ли вывести средства
		if (stats.availableForWithdrawal <= 0) {
			const message = ReferralMessages.withdrawalNoFunds(t);
			const keyboard = KeyboardUtils.createReferralBackKeyboard(t);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
			return;
		}

		if (!ReferralService.canWithdraw(stats.availableForWithdrawal)) {
			const message = ReferralMessages.withdrawalInsufficient(t, stats.availableForWithdrawal);
			const keyboard = KeyboardUtils.createReferralBackKeyboard(t);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
			return;
		}

		// Запрашиваем подтверждение вывода
		const message = ReferralMessages.withdrawalConfirm(t, stats.availableForWithdrawal);
		const keyboard = KeyboardUtils.createWithdrawalConfirmKeyboard(t, stats.availableForWithdrawal);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Подтверждение вывода средств
	 */
	async handleConfirmWithdraw(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUser(ctx.from.id);

		// Получаем статистику рефералов
		const stats = await this.referralService.getReferralStats(user.id);
		const amount = stats.availableForWithdrawal;

		// Отправляем уведомление администраторам
		const adminMessage = ReferralMessages.withdrawalAdminNotification(t, {
			username: user.username || user.first_name || 'Unknown',
			userId: user.telegram_id,
			amount: amount,
			referrals: stats.totalReferrals
		});

		// Отправляем уведомление всем администраторам
		for (const adminId of ADMIN_IDS) {
			try {
				await this.bot.telegram.sendMessage(adminId, adminMessage, {
					parse_mode: 'HTML'
				});
			} catch (error) {
				console.error(`Ошибка отправки уведомления администратору ${adminId}:`, error);
			}
		}

		// Отправляем подтверждение пользователю
		const message = ReferralMessages.withdrawalSuccess(t, amount);
		const keyboard = KeyboardUtils.createReferralBackKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}
}

module.exports = ReferralCallbacks;
