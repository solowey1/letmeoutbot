const KeyboardUtils = require('../../../utils/keyboards');
const { ReferralMessages } = require('../../../services/messages');
const ReferralService = require('../../../services/ReferralService');
const { ADMIN_IDS } = require('../../../config/constants');
const config = require('../../../config');
const { starsToTon } = require('../../../services/TonService');
const awaitingWallet = require('../../../utils/tonWalletState');

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
		const user = await this.db.getUserByTelegramId(ctx.from.id);

		// Получаем статистику рефералов
		const stats = await this.referralService.getReferralStats(user.id);

		// Получаем курс TON для отображения
		let tonEquivalent = null;
		try {
			if (stats.availableForWithdrawal > 0) {
				tonEquivalent = await starsToTon(stats.availableForWithdrawal);
			}
		} catch (_) {}

		// Генерируем реферальную ссылку
		const botInfo = await ctx.telegram.getMe();
		const referralLink = ReferralService.generateReferralLink(botInfo.username, user.telegram_id);

		// Текст для приглашения
		const inviteText = ReferralMessages.inviteText(t, referralLink);

		// Генерируем сообщение
		const message = ReferralMessages.menu(t, stats, tonEquivalent, user.ton_wallet);
		const keyboard = KeyboardUtils.createReferralMenuKeyboard(t, inviteText, user.ton_wallet);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}

	/**
	 * Запрашивает у пользователя TON-адрес для вывода
	 */
	async handleSetWallet(ctx) {
		const t = ctx.i18n.t;
		awaitingWallet.set(ctx.from.id, 'referral');

		const keyboard = KeyboardUtils.createReferralBackKeyboard(t);
		await ctx.editMessageText(
			ReferralMessages.setWalletPrompt(t),
			{ ...keyboard, parse_mode: 'HTML' }
		);
	}

	/**
	 * Кнопка "Пригласить друзей" - открывает нативное меню "Поделиться"
	 */
	async handleInvite(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUserByTelegramId(ctx.from.id);

		// Генерируем реферальную ссылку
		const botInfo = await ctx.telegram.getMe();
		const referralLink = ReferralService.generateReferralLink(botInfo.username, user.telegram_id);

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
		const user = await this.db.getUserByTelegramId(ctx.from.id);

		// Генерируем реферальную ссылку
		const botInfo = await ctx.telegram.getMe();
		const referralLink = ReferralService.generateReferralLink(botInfo.username, user.telegram_id);

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
		const user = await this.db.getUserByTelegramId(ctx.from.id);

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
		const user = await this.db.getUserByTelegramId(ctx.from.id);

		// Проверяем наличие TON-кошелька
		if (!user.ton_wallet) {
			awaitingWallet.set(ctx.from.id, 'referral');
			const keyboard = KeyboardUtils.createReferralBackKeyboard(t);
			await ctx.editMessageText(
				ReferralMessages.setWalletPrompt(t),
				{ ...keyboard, parse_mode: 'HTML' }
			);
			return;
		}

		// Получаем статистику рефералов
		const stats = await this.referralService.getReferralStats(user.id);

		// Проверяем, можно ли вывести средства
		if (stats.availableForWithdrawal <= 0) {
			const message = ReferralMessages.withdrawalNoFunds(t);
			const keyboard = KeyboardUtils.createReferralBackKeyboard(t);
			await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
			return;
		}

		if (!ReferralService.canWithdraw(stats.availableForWithdrawal)) {
			const message = ReferralMessages.withdrawalInsufficient(t, stats.availableForWithdrawal);
			const keyboard = KeyboardUtils.createReferralBackKeyboard(t);
			await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
			return;
		}

		// Получаем курс для отображения в подтверждении
		let tonAmount = null;
		try {
			tonAmount = await starsToTon(stats.availableForWithdrawal);
		} catch (_) {}

		const message = ReferralMessages.withdrawalConfirm(t, stats.availableForWithdrawal, tonAmount, user.ton_wallet);
		const keyboard = KeyboardUtils.createWithdrawalConfirmKeyboard(t, stats.availableForWithdrawal);

		await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
	}

	/**
	 * Подтверждение вывода средств
	 */
	async handleConfirmWithdraw(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUserByTelegramId(ctx.from.id);

		if (!user.ton_wallet) {
			await ctx.answerCbQuery('Сначала укажите GRAM-кошелёк');
			return;
		}

		// Получаем статистику рефералов
		const stats = await this.referralService.getReferralStats(user.id);
		const amount = stats.availableForWithdrawal;

		// Рассчитываем TON-эквивалент в момент запроса
		let tonAmount = null;
		try {
			tonAmount = await starsToTon(amount);
		} catch (_) {}

		// Создаём запись о выводе средств в базе данных
		const withdrawalId = await this.db.createWithdrawal(user.id, amount, tonAmount, user.ton_wallet);

		// Отправляем уведомление администраторам
		const adminMessage = ReferralMessages.withdrawalAdminNotification(t, {
			username: user.username || user.first_name || 'Unknown',
			userId: user.telegram_id,
			amount: amount,
			tonAmount: tonAmount,
			tonWallet: user.ton_wallet,
			referrals: stats.totalReferrals,
			withdrawalId: withdrawalId,
		});

		const withdrawalKeyboard = KeyboardUtils.createWithdrawalAdminKeyboard(t, withdrawalId);
		for (const adminId of ADMIN_IDS) {
			try {
				await this.bot.telegram.sendMessage(adminId, adminMessage, {
					parse_mode: 'HTML',
					...withdrawalKeyboard,
				});
			} catch (error) {
				console.error(`Ошибка отправки уведомления администратору ${adminId}:`, error);
			}
		}

		// Отправляем подтверждение пользователю
		const message = ReferralMessages.withdrawalSuccess(t, amount, tonAmount);
		const keyboard = KeyboardUtils.createReferralBackKeyboard(t);

		await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
	}

	/**
	 * Показать историю выводов
	 */
	async handleWithdrawalHistory(ctx) {
		const t = ctx.i18n.t;
		const user = await this.db.getUserByTelegramId(ctx.from.id);

		// Получаем историю выводов
		const withdrawals = await this.db.getUserWithdrawals(user.id);

		// Генерируем сообщение
		const message = ReferralMessages.withdrawalHistory(t, withdrawals);
		const keyboard = KeyboardUtils.createReferralBackKeyboard(t);

		await ctx.editMessageText(message, {
			...keyboard,
			parse_mode: 'HTML'
		});
	}
}

module.exports = ReferralCallbacks;
