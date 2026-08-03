const { Markup } = require('../../utils/markup');
const KeyboardUtils = require('../../utils/keyboards');
const { MenuMessages } = require('../../services/messages');
const { ADMIN_IDS, CALLBACK_ACTIONS } = require('../../config/constants');
const pendingBroadcast = require('../../utils/broadcastState');
const awaitingWallet = require('../../utils/tonWalletState');
const adminEditState = require('../../utils/adminEditState');
const { isValidTonAddress } = require('../../services/TonService');
const { AdminMessages } = require('../../services/messages');

class MessageHandlers {
	constructor(database, bot, broadcastCallbacks = null, adminCallbacks = null) {
		this.db = database;
		this.bot = bot;
		this.broadcastCallbacks = broadcastCallbacks;
		this.adminCallbacks = adminCallbacks;
	}

	async handleMessage(ctx) {
		const userId = ctx.from.id;

		// Ввод новой цены/лимита тарифа из админки
		if (this.adminCallbacks && ADMIN_IDS.includes(userId) && adminEditState.has(userId)) {
			await this.handleAdminPlanInput(ctx);
			return;
		}

		// Обработка сообщения для новой системы рассылок (BroadcastCallbacks)
		if (this.broadcastCallbacks && ADMIN_IDS.includes(userId)) {
			const session = this.broadcastCallbacks.broadcastSessions.get(userId);
			if (session && session.step === 'awaiting_message') {
				await this.broadcastCallbacks.handleMessageText(ctx);
				return;
			}
		}

		// Обработка сообщения для рассылки (любой тип контента)
		if (ADMIN_IDS.includes(userId) && pendingBroadcast.has(userId)) {
			const state = pendingBroadcast.get(userId);
			pendingBroadcast.delete(userId);

			// /cancel — только для текстовых сообщений
			if (ctx.message.text && (ctx.message.text === '/cancel' || ctx.message.text.startsWith('/cancel'))) {
				const t = ctx.i18n.t;
				await ctx.reply(t('admin.broadcast.cancelled', { ns: 'message' }));
				return;
			}

			await this.executeBroadcast(ctx, state.audience);
			return;
		}

		// Обработка ввода TON-кошелька
		if (awaitingWallet.has(userId)) {
			const t = ctx.i18n.t;
			const source = awaitingWallet.get(userId); // 'settings' | 'referral'
			awaitingWallet.delete(userId);
			const address = ctx.message.text?.trim();

			if (!address || !isValidTonAddress(address)) {
				const retryAction = source === 'settings'
					? CALLBACK_ACTIONS.SETTINGS.TON_WALLET_INPUT
					: CALLBACK_ACTIONS.REFERRAL.SET_WALLET;
				const retryBtn = Markup.button.callback(t('buttons.retry'), retryAction);
				retryBtn.icon_custom_emoji_id = '5769406891289481208';
				await ctx.reply(
					t('settings.ton_wallet.invalid_address', { ns: 'message' }),
					{ parse_mode: 'HTML', ...Markup.inlineKeyboard([[retryBtn]]) }
				);
				return;
			}

			await this.db.updateUserTonWallet(userId, address);

			const successKeyboard = source === 'settings'
				? Markup.inlineKeyboard([
					[(() => { const b = Markup.button.callback(t('buttons.settings_ton'), CALLBACK_ACTIONS.SETTINGS.TON_WALLET); b.icon_custom_emoji_id = '5769406891289481208'; return b; })()],
					[Markup.button.callback(t('buttons.settings'), CALLBACK_ACTIONS.SETTINGS.MENU)],
				])
				: Markup.inlineKeyboard([
					[Markup.button.callback(t('buttons.ton_wallet_withdraw_now'), CALLBACK_ACTIONS.REFERRAL.WITHDRAW)],
					[Markup.button.callback(t('buttons.ton_wallet_referrals'), CALLBACK_ACTIONS.REFERRAL.MENU)],
				]);

			await ctx.reply(
				t('settings.ton_wallet.saved', { ns: 'message', address }),
				{ parse_mode: 'HTML', ...successKeyboard }
			);
			return;
		}

		if (!ctx.message.text) return;

		await this.showMainMenu(ctx);
	}

	/**
	 * Ввод нового значения цены/лимита тарифа админом.
	 * Состояние снимается в любом исходе, кроме неверного формата —
	 * там админ остаётся в режиме ввода и может просто повторить.
	 */
	async handleAdminPlanInput(ctx) {
		const t = ctx.i18n.t;
		const userId = ctx.from.id;
		const { planId, field, setting } = adminEditState.get(userId);
		const text = ctx.message.text?.trim();

		if (text === '/cancel') {
			adminEditState.delete(userId);
			await ctx.reply(t('admin.settings.edit_cancelled', { ns: 'message' }));
			return;
		}

		if (!text) {
			await ctx.reply(t('admin.settings.invalid_value', { ns: 'message' }));
			return;
		}

		let result;
		try {
			result = field === 'setting'
				? await this.adminCallbacks.applySettingEdit(setting, text)
				: await this.adminCallbacks.applyPlanEdit(planId, field, text);
		} catch (error) {
			console.error('Ошибка сохранения тарифа:', error.message);
			adminEditState.delete(userId);
			await ctx.reply(t('admin.loading_error', { ns: 'message' }));
			return;
		}

		if (!result.ok) {
			if (result.error === 'invalid') {
				await ctx.reply(t('admin.settings.invalid_value', { ns: 'message' }));
				return;
			}
			adminEditState.delete(userId);
			await ctx.reply(t('keys.plan_not_found', { ns: 'error' }));
			return;
		}

		adminEditState.delete(userId);

		if (field === 'setting') {
			await ctx.reply(`✅ ${t('admin.settings.saved', { ns: 'message' })}`);
			return;
		}

		await ctx.reply(
			`✅ ${t('admin.settings.saved', { ns: 'message' })}\n\n${AdminMessages.planDetails(t, result.plan)}`,
			{ parse_mode: 'HTML', ...KeyboardUtils.createAdminPlanKeyboard(t, result.plan) }
		);
	}

	async _getUsersForAudience(audience) {
		switch (audience) {
			case 'active':
				return this.db.getUsersWithActiveKeys();
			case 'buyers':
				return this.db.getBuyerUsers();
			case 'non_buyers':
				return this.db.getNonBuyerUsers();
			default:
				return this.db.getAllUsers(10000);
		}
	}

	async executeBroadcast(ctx, audience) {
		const t = ctx.i18n.t;

		let users;
		try {
			users = await this._getUsersForAudience(audience);
		} catch (error) {
			console.error('Broadcast: ошибка получения пользователей:', error);
			await ctx.reply(t('admin.loading_error', { ns: 'message' }));
			return;
		}

		if (!users || users.length === 0) {
			await ctx.reply(t('admin.broadcast.no_users', { ns: 'message' }));
			return;
		}

		const statusMsg = await ctx.reply(t('admin.broadcast.sending', { ns: 'message' }));

		const fromChatId = ctx.chat.id;
		const messageId = ctx.message.message_id;

		let sent = 0;
		let errors = 0;

		for (const user of users) {
			try {
				await this.bot.api.copyMessage(user.telegram_id, fromChatId, messageId);
				sent++;
			} catch {
				errors++;
			}
			// Задержка чтобы не упереться в rate limit Telegram (30 msg/s max)
			await new Promise(resolve => setTimeout(resolve, 35));
		}

		const result = t('admin.broadcast.done', { ns: 'message', sent, errors });
		try {
			await this.bot.api.editMessageText(ctx.chat.id, statusMsg.message_id, result, { parse_mode: 'HTML' });
		} catch {
			await ctx.reply(result, { parse_mode: 'HTML' });
		}
	}

	async showMainMenu(ctx) {
		const t = ctx.i18n.t;
		const message = MenuMessages.welcome(t);
		const isAdmin = ADMIN_IDS.includes(ctx.from.id);
		const keyboard = KeyboardUtils.createMainMenu(t, isAdmin);

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});
	}

	// Регистрация обработчиков сообщений в боте
	register(bot) {
		bot.on('message', async (ctx) => {
			try {
				await this.handleMessage(ctx);
			} catch (error) {
				console.error('Ошибка обработки сообщения:', error);
				const t = ctx.i18n?.t || ((key) => key);
				await ctx.reply(t('generic.default', { ns: 'error' }));
			}
		});
	}
}

module.exports = MessageHandlers;
