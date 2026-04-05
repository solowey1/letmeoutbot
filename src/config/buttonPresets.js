const BUTTON_PRESETS = {
	home:      { text: 'buttons.home',              action: 'home',        style: null,      icon: '5257963315258204021' },
	back:      { text: 'buttons.back',              action: null,          style: null,      icon: '5960671702059848143' },
	buy:       { text: 'buttons.buy.key',           action: 'keys_buy',   style: 'primary', icon: '5427168083074628963' },
	buy_first: { text: 'buttons.buy.first',         action: 'keys_buy',   style: 'primary', icon: '5427168083074628963' },
	pay:       { text: 'buttons.pay',               action: null,          style: 'success', icon: '5942783678668085067' },
	admin:     { text: 'buttons.admin_panel',       action: 'admin_menu', style: 'danger',  icon: null },
	help:      { text: 'buttons.help',              action: 'help',        style: null,      icon: null },
	language:  { text: 'buttons.language',           action: 'lang_set',   style: null,      icon: '5769403725898584391' },
	lang_ru:   { text: 'buttons.languages.russian',  action: 'set_lang_ru', style: null,     icon: '5398017006165305287' },
	lang_en:   { text: 'buttons.languages.english',  action: 'set_lang_en', style: null,     icon: '5458416160586342331' },
};

module.exports = { BUTTON_PRESETS };
