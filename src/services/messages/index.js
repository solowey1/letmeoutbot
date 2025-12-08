/**
 * Единая точка импорта всех сервисов сообщений
 */
const MenuMessages = require('./MenuMessages');
const KeyMessages = require('./KeyMessages');
const PaymentMessages = require('./PaymentMessages');
const PlanMessages = require('./PlanMessages');
const AdminMessages = require('./AdminMessages');
const BroadcastMessages = require('./BroadcastMessages');

/**
 * Главный класс для работы с сообщениями
 * Предоставляет удобный API для генерации всех типов сообщений
 */
class MessageService {
	constructor() {
		this.menu = MenuMessages;
		this.key = KeyMessages;
		this.payment = PaymentMessages;
		this.plan = PlanMessages;
		this.admin = AdminMessages;
		this.broadcast = BroadcastMessages;
	}

	/**
	 * Быстрый доступ к сообщениям меню
	 */
	static get Menu() {
		return MenuMessages;
	}

	/**
	 * Быстрый доступ к сообщениям подписок
	 */
	static get Key() {
		return KeyMessages;
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
	 * Быстрый доступ к сообщениям админки
	 */
	static get Admin() {
		return AdminMessages;
	}

	/**
	 * Быстрый доступ к сообщениям рассылки
	 */
	static get Broadcast() {
		return BroadcastMessages;
	}
}

module.exports = MessageService;
module.exports.MenuMessages = MenuMessages;
module.exports.KeyMessages = KeyMessages;
module.exports.PaymentMessages = PaymentMessages;
module.exports.PlanMessages = PlanMessages;
module.exports.AdminMessages = AdminMessages;
module.exports.BroadcastMessages = BroadcastMessages;
