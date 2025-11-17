/**
 * Сервис для генерации сообщений админ-панели
 */
class AdminMessages {
	/**
	 * Главная страница админ-панели
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static adminPanel(t) {
		return [
			`🔧 <b>${t('admin.title', { ns: 'message' })}</b>`,
			'',
			t('admin.description', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Список пользователей
	 * @param {Function} t - Функция перевода
	 * @param {Array} users - Массив пользователей
	 * @returns {string}
	 */
	static usersList(t, users) {
		if (!users || users.length === 0) {
			return [
				`👥 ${t('admin.users.title', { ns: 'message' })}`,
				`❌ ${t('admin.users.no_users', { ns: 'message' })}`,
			].join('\n\n');
		}

		const message = [
			`👥 <b>${t('admin.users.last_10', { ns: 'message' })}</b>`,
			''
		];

		users.forEach((user, index) => {
			const regDate = new Date(user.created_at).toLocaleDateString();
			const firstName = user.first_name || 'Unknown';
			const username = user.username ? `@${user.username}` : 'без username';

			message.push(`${index + 1}. <b>${firstName}</b> (${username})`);
			message.push(`   ID: ${user.telegram_id}`);
			message.push(`   ${t('admin.users.user_keys', { ns: 'message' })}: ${user.key_count || 0}`);
			message.push(`   ${t('common.registration')}: ${regDate}`);
			message.push('');
		});

		return message.join('\n');
	}

	/**
	 * Статистика бота
	 * @param {Function} t - Функция перевода
	 * @param {Object} stats - Объект со статистикой
	 * @returns {string}
	 */
	static stats(t, stats) {
		return [
			`📊 <b>${t('admin.stats.title', { ns: 'message' })}</b>`,
			'',
			`👥 ${t('admin.stats.total_users', { ns: 'message' })}: ${stats.totalUsers || 0}`,
			`🔑 ${t('admin.stats.active_keys', { ns: 'message' })}: ${stats.activeKeys || 0}`,
			`💰 ${t('admin.stats.total_revenue', { ns: 'message' })}: ${stats.totalRevenue || 0} ⭐`,
			`✅ ${t('admin.stats.successful_payments', { ns: 'message' })}: ${stats.successfulPayments || 0}`,
		].join('\n');
	}

	/**
	 * Список платежей
	 * @param {Function} t - Функция перевода
	 * @param {Array} payments - Массив платежей
	 * @returns {string}
	 */
	static paymentsList(t, payments) {
		if (!payments || payments.length === 0) {
			return [
				`💰 ${t('admin.payments.title', { ns: 'message' })}`,
				`❌ ${t('admin.payments.no_payments', { ns: 'message' })}`,
			].join('\n\n');
		}

		const message = [
			`💰 ${t('admin.payments.title', { ns: 'message' })}`,
			''
		];

		payments.forEach((payment, index) => {
			const date = new Date(payments.created_at).toLocaleString();
			const status = payments.status === 'completed' ? '✅' : payments.status === 'pending' ? '⏳' : '❌';

			message.push(`${index + 1}. ${status} ${payments.amount} ⭐`);
			message.push(`   ${t('users.user')}: ${payments.telegram_id}`);
			message.push(`   ${date}`);
			message.push('');
		});

		return message.join('\n');
	}

	/**
	 * Список подписок (ключей)
	 * @param {Function} t - Функция перевода
	 * @param {Array} keys - Массив ключей
	 * @returns {string}
	 */
	static keysList(t, keys) {
		if (!keys || keys.length === 0) {
			return [
				`🔑 ${t('admin.keys.title', { ns: 'message' })}`,
				`❌ ${t('admin.keys.no_active_keys', { ns: 'message' })}`,
			].join('\n\n');
		}

		const message = [
			`🔑 ${t('admin.keys.title', { ns: 'message' })}`,
			''
		];

		keys.forEach((sub, index) => {
			const status = sub.status === 'active' ? '🟢' : '🔴';
			const expiryDate = new Date(sub.expires_at).toLocaleDateString();

			message.push(`${index + 1}. ${status} ID: ${sub.id}`);
			message.push(`   ${t('common.user')}: ${sub.telegram_id}`);
			message.push(`   ${t('common.plan')}: ${sub.plan_name || 'Unknown'}`);
			message.push(`   ${t('common.expires')}: ${expiryDate}`);
			message.push('');
		});

		return message.join('\n');
	}

	/**
	 * Список pending ключей
	 * @param {Function} t - Функция перевода
	 * @param {Array} pendingKeys - Массив pending ключей
	 * @param {Function} getUserById - Функция для получения пользователя
	 * @returns {Promise<string>}
	 */
	static async pendingKeysList(t, pendingKeys, getUserById) {
		let message = `⏳ <b>${t('admin.pending_keys.title', { ns: 'message' })}</b>\n\n`;

		if (pendingKeys.length === 0) {
			message += t('admin.pending_keys.no_pending', { ns: 'message' });
		} else {
			for (const key of pendingKeys) {
				const user = await getUserById(key.user_id);
				message += `📋 ${t('admin.pending_keys.id', { ns: 'message' })}: ${key.id}\n`;
				message += `👤 ${t('common.user')}: ${user?.first_name || 'Unknown'} (@${user?.username || 'нет'})\n`;
				message += `📦 ${t('admin.pending_keys.plan', { ns: 'message' })}: ${key.plan_id}\n`;
				message += `🕐 ${t('admin.pending_keys.created', { ns: 'message' })}: ${new Date(key.created_at).toLocaleString()}\n`;
				message += `⚠️ ${t('admin.pending_keys.status_label', { ns: 'message' })}: ${key.status}\n\n`;
			}
		}

		return message;
	}

	/**
	 * Отказ в доступе
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static accessDenied(t) {
		return `🛑 ${t('admin.no_access', { ns: 'error' })}`;
	}

	/**
	 * Ошибка админ-панели
	 * @param {Function} t - Функция перевода
	 * @param {string} error - Описание ошибки
	 * @returns {string}
	 */
	static error(t, error = null) {
		const message = [
			`❌ ${t('admin.default', { ns: 'error' })}`,
		];

		if (error) {
			message.push('');
			message.push(`<i>${error}</i>`);
		}

		return message.join('\n');
	}
}

module.exports = AdminMessages;
