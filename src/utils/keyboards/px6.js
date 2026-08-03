const { Markup } = require('../markup');
const { CALLBACK_ACTIONS } = require('../../config/constants');
const Px6PricingService = require('../../services/Px6PricingService');
const { btn } = require('./common');

const P = CALLBACK_ACTIONS.PX6;

/** Шаг 1 — версия прокси */
function createPx6VersionKeyboard(t) {
	const rows = Px6PricingService.SALE_VERSIONS.map(version => [
		Markup.button.callback(Px6PricingService.versionLabel(version), `${P.COUNTRY}_${version}`)
	]);
	rows.push([btn(t, 'home')]);
	return Markup.inlineKeyboard(rows);
}

/** Шаг 2 — страна. Флаг собираем из iso2 через regional indicator symbols */
function createPx6CountryKeyboard(t, version, countries) {
	const rows = [];
	for (let i = 0; i < countries.length; i += 3) {
		rows.push(countries.slice(i, i + 3).map(code =>
			Markup.button.callback(
				`${countryFlag(code)} ${code.toUpperCase()}`,
				`${P.PERIOD}_${version}_${code}`
			)
		));
	}
	rows.push([
		btn(t, 'back', P.MENU),
		btn(t, 'home')
	]);
	return Markup.inlineKeyboard(rows);
}

/** Шаг 3 — срок с посчитанной ценой в звёздах */
function createPx6PeriodKeyboard(t, version, country, quotes) {
	const rows = quotes.map(q => [
		Markup.button.callback(
			`${q.stars} ⭐ — ${q.period} ${t('px6.days', { ns: 'message' })}`,
			`${CALLBACK_ACTIONS.PAYMENT.CREATE_INVOICE}_${Px6PricingService.buildPlanId(version, country, q.period)}`
		)
	]);
	rows.push([
		btn(t, 'back', `${P.COUNTRY}_${version}`),
		btn(t, 'home')
	]);
	return Markup.inlineKeyboard(rows);
}

function countryFlag(iso2) {
	if (!iso2 || iso2.length !== 2) return '🌐';
	return String.fromCodePoint(
		...[...iso2.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)
	);
}

module.exports = {
	createPx6VersionKeyboard,
	createPx6CountryKeyboard,
	createPx6PeriodKeyboard,
	countryFlag
};
