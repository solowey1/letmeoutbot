/**
 * Единая точка импорта всех сервисов сообщений
 */
const MenuMessages = require('./MenuMessages');
const KeyMessages = require('./KeyMessages');
const PlanMessages = require('./PlanMessages');
const AdminMessages = require('./AdminMessages');

/**
 * Главный класс для работы с сообщениями
 * Предоставляет удобный API для генерации всех типов сообщений
 */
class MessageService {
	constructor() {
		this.menu = MenuMessages;
		this.key = KeyMessages;
		this.plan = PlanMessages;
		this.admin = AdminMessages;
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
}

module.exports = MessageService;
module.exports.MenuMessages = MenuMessages;
module.exports.KeyMessages = KeyMessages;
module.exports.PlanMessages = PlanMessages;
module.exports.AdminMessages = AdminMessages;
