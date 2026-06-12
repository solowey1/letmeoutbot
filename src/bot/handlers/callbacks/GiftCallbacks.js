const KeyboardUtils = require('../../../utils/keyboards');
const { MenuMessages } = require('../../../services/messages');
const { ADMIN_IDS } = require('../../../config/constants');
const { Markup } = require('telegraf');

class GiftCallbacks {
	constructor(database, keysService) {
		this.db = database;
		this.keysService = keysService;
	}

	async handleGiftInfo(ctx) {
		const t = ctx.i18n.t;
		const text = t('gift.info', { ns: 'message' });

		const keyboard = Markup.inlineKeyboard([
			[Markup.button.callback(t('buttons.claim_gift', { ns: 'main' }), 'gift_claim')],
			[Markup.button.callback(t('buttons.back', { ns: 'main' }), 'home')]
		]);

		await ctx.editMessageText(text, { ...keyboard, parse_mode: 'HTML' });
	}

	async handleGiftClaim(ctx) {
		const t = ctx.i18n.t;
		const telegramId = ctx.from.id;

		const eligible = await this.db.isGiftEligible(telegramId);
		if (!eligible) {
			const isAdmin = ADMIN_IDS.includes(telegramId);
			const showGift = false;
			const keyboard = KeyboardUtils.createMainMenu(t, isAdmin, showGift);
			const message = MenuMessages.welcome(t);
			await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
			return;
		}

		const user = await this.db.getUserByTelegramId(telegramId);

		try {
			const { vless, outline } = await this.keysService.claimGiftKeys(user.id, telegramId);

			const text = t('gift.success', {
				ns: 'message',
				vlessUrl: vless.accessUrl,
				outlineUrl: outline.accessUrl
			});

			const isAdmin = ADMIN_IDS.includes(telegramId);
			const menuKeyboard = KeyboardUtils.createMainMenu(t, isAdmin, false);

			await ctx.editMessageText(text, { ...menuKeyboard, parse_mode: 'HTML', disable_web_page_preview: true });
		} catch (error) {
			console.error('❌ [Gift] Ошибка выдачи подарка:', error.message);
			await ctx.reply(t('gift.error', { ns: 'message' }));
		}
	}
}

module.exports = GiftCallbacks;
