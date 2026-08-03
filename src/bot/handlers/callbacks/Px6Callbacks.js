const KeyboardUtils = require('../../../utils/keyboards');
const Px6PricingService = require('../../../services/Px6PricingService');

/**
 * Покупка прокси px6: тип (в меню Proxy) → страна → срок → счёт.
 * Цена динамическая, поэтому считается на последнем шаге и «зашивается»
 * в счёт; после оплаты параметры заказа восстанавливаются из id тарифа.
 */
class Px6Callbacks {
	constructor(database, px6Service, pricingService, settingsService) {
		this.db = database;
		this.px6 = px6Service;
		this.pricing = pricingService;
		this.settings = settingsService;
	}

	/** Продажи включены и настроены? */
	async _guard(ctx) {
		const t = ctx.i18n.t;

		if (!this.px6?.isConfigured || !this.settings?.isSalesEnabled('px6')) {
			await ctx.editMessageText(
				t('payments.sales_disabled', { ns: 'message' }),
				{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
			);
			return false;
		}
		return true;
	}

	async _fail(ctx, error) {
		const t = ctx.i18n.t;
		console.error('❌ px6 UI:', error.message);
		await ctx.editMessageText(
			t('px6.unavailable', { ns: 'message' }),
			{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
		);
	}

	/** Шаг 1 — страны, доступные для выбранной версии */
	async handleChooseCountry(ctx, version) {
		const t = ctx.i18n.t;
		if (!await this._guard(ctx)) return;

		try {
			const countries = await this.px6.getCountries(version);
			if (!countries.length) {
				await ctx.editMessageText(
					t('px6.no_countries', { ns: 'message' }),
					{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
				);
				return;
			}

			// Заметка о назначении типа — чтобы не купили IPv6 туда,
			// где он не работает, или IPv4 вместо MTProto для Telegram
			const message = [
				`<b>${Px6PricingService.versionLabel(version)}</b>`,
				'',
				t(`px6.note.v${version}`, { ns: 'message' }),
				'',
				t('px6.choose_country', { ns: 'message' })
			].join('\n');

			await ctx.editMessageText(
				message,
				{ ...KeyboardUtils.createPx6CountryKeyboard(t, version, countries), parse_mode: 'HTML' }
			);
		} catch (error) {
			await this._fail(ctx, error);
		}
	}

	/** Шаг 2 — сроки с ценами */
	async handleChoosePeriod(ctx, version, country) {
		const t = ctx.i18n.t;
		if (!await this._guard(ctx)) return;

		try {
			const [available, quotes] = await Promise.all([
				this.px6.getCount(country, version),
				this.pricing.quoteAllPeriods({ version })
			]);

			if (!available) {
				await ctx.editMessageText(
					t('px6.out_of_stock', { ns: 'message' }),
					{ ...KeyboardUtils.createBackToMenuKeyboard(t), parse_mode: 'HTML' }
				);
				return;
			}

			if (!quotes.length) {
				await this._fail(ctx, new Error('getprice вернул пусто для всех сроков'));
				return;
			}

			await ctx.editMessageText(
				t('px6.choose_period', {
					ns: 'message',
					type: Px6PricingService.versionLabel(version),
					country: country.toUpperCase()
				}),
				{ ...KeyboardUtils.createPx6PeriodKeyboard(t, version, country, quotes), parse_mode: 'HTML' }
			);
		} catch (error) {
			await this._fail(ctx, error);
		}
	}
}

module.exports = Px6Callbacks;
