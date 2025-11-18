/**
 * Единая точка импорта всех сервисов сообщений
 */
const AdminMessages = require('./AdminMessages');
const KeyMessages = require('./KeyMessages');
const MenuMessages = require('./MenuMessages');
const PaymentMessages = require('./PaymentMessages');
const PlanMessages = require('./PlanMessages');
const ReferralMessages = require('./ReferralMessages');

/**
 * Главный класс для работы с сообщениями
 * Предоставляет удобный API для генерации всех типов сообщений
 */
class MessageService {
	constructor() {
		this.admin = AdminMessages;
		this.key = KeyMessages;
		this.menu = MenuMessages;
		this.payment = PaymentMessages;
		this.plan = PlanMessages;
		this.referral = ReferralMessages;
	}

	/**
	 * Быстрый доступ к сообщениям админки
	 */
	static get Admin() {
		return AdminMessages;
	}

	/**
	 * Быстрый доступ к сообщениям подписок
	 */
	static get Key() {
		return KeyMessages;
	}

	/**
	 * Быстрый доступ к сообщениям меню
	 */
	static get Menu() {
		return MenuMessages;
	}

	/**
	 * Быстрый доступ к сообщениям платежей
	 */
	static get Payment() {
		return PaymentMessages;
	}

	/**
	 * Быстрый доступ к сообщениям планов
	 */
	static get Plan() {
		return PlanMessages;
	}

	/**
	 * Быстрый доступ к сообщениям рефералов
	 */
	static get Referral() {
		return ReferralMessages;
	}
}

module.exports = MessageService;
module.exports.AdminMessages = AdminMessages;
module.exports.KeyMessages = KeyMessages;
module.exports.MenuMessages = MenuMessages;
module.exports.PaymentMessages = PaymentMessages;
module.exports.PlanMessages = PlanMessages;
module.exports.ReferralMessages = ReferralMessages;
