/**
 * Сервис для генерации сообщений реферальной программы
 */
class ReferralMessages {
	/**
	 * Главное меню реферальной программы
	 * @param {Function} t - Функция перевода
	 * @param {Object} stats - Статистика рефералов
	 * @returns {string}
	 */
	static menu(t, stats) {
		const howItWorks = t('referral.how_it_works', { ns: 'message' });
		const howItWorksList = Array.isArray(howItWorks)
			? howItWorks.map((item, i) => `${i + 1}. ${item}`)
			: [`1. ${howItWorks}`];

		return [
			`<b>${t('referral.title', { ns: 'message' })}</b>`,
			t('referral.description', { ns: 'message' }),
			'',
			'📊 <b>Ваша статистика:</b>',
			`👥 ${t('referral.stats.total_referrals', { ns: 'message' })}: <b>${stats.totalReferrals}</b>`,
			`💰 ${t('referral.stats.total_earned', { ns: 'message' })}: <b>${stats.totalEarned} ⭐</b>`,
			`💸 ${t('referral.stats.total_withdrawn', { ns: 'message' })}: <b>${stats.totalWithdrawn} ⭐</b>`,
			`✅ ${t('referral.stats.available_for_withdrawal', { ns: 'message' })}: <b>${stats.availableForWithdrawal} ⭐</b>`,
			`⏳ ${t('referral.stats.pending_amount', { ns: 'message' })}: <b>${stats.pendingAmount} ⭐</b>`,
			'',
			`<b>${t('referral.how_it_works_title', { ns: 'message' })}</b>`,
			...howItWorksList,
		].join('\n');
	}

	/**
	 * Сообщение с реферальной ссылкой
	 * @param {Function} t - Функция перевода
	 * @param {string} referralLink - Реферальная ссылка
	 * @returns {string}
	 */
	static referralLink(t, referralLink) {
		return [
			`<b>${t('referral.your_link', { ns: 'message' })}</b>`,
			'',
			`<code>${referralLink}</code>`,
			'',
			t('referral.share_link', { ns: 'message' }),
		].join('\n');
	}

	/**
	 * Текст для приглашения друзей (для кнопки "Поделиться")
	 * @param {Function} t - Функция перевода
	 * @param {string} referralLink - Реферальная ссылка
	 * @returns {string}
	 */
	static inviteText(t, referralLink) {
		return [
			t('referral.invite_text', { ns: 'message' }),
			'',
			referralLink,
		].join('\n');
	}

	/**
	 * Список рефералов
	 * @param {Function} t - Функция перевода
	 * @param {Array} referrals - Список рефералов
	 * @returns {string}
	 */
	static referralsList(t, referrals) {
		if (!referrals || referrals.length === 0) {
			return t('referral.no_referrals', { ns: 'message' });
		}

		const referralsList = referrals.map(ref => {
			const name = ref.first_name || ref.username || 'Пользователь';
			const earned = ref.bonus_earned || 0;
			return t('referral.referral_item', {
				ns: 'message',
				name,
				earned,
			});
		});

		return [
			`<b>${t('referral.referrals_list', { ns: 'message' })}</b>`,
			'',
			...referralsList,
		].join('\n');
	}

	/**
	 * Подтверждение вывода средств
	 * @param {Function} t - Функция перевода
	 * @param {number} amount - Сумма вывода
	 * @returns {string}
	 */
	static withdrawalConfirm(t, amount) {
		return t('referral.withdrawal.confirm', {
			ns: 'message',
			amount,
		});
	}

	/**
	 * Успешный запрос на вывод средств
	 * @param {Function} t - Функция перевода
	 * @param {number} amount - Сумма вывода
	 * @returns {string}
	 */
	static withdrawalSuccess(t, amount) {
		return t('referral.withdrawal.success', {
			ns: 'message',
			amount,
		});
	}

	/**
	 * Недостаточно средств для вывода
	 * @param {Function} t - Функция перевода
	 * @param {number} amount - Доступная сумма
	 * @returns {string}
	 */
	static withdrawalInsufficient(t, amount) {
		return t('referral.withdrawal.insufficient', {
			ns: 'message',
			amount,
		});
	}

	/**
	 * Нет средств для вывода
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static withdrawalNoFunds(t) {
		return t('referral.withdrawal.no_funds', { ns: 'message' });
	}

	/**
	 * Уведомление администраторам о запросе на вывод
	 * @param {Function} t - Функция перевода
	 * @param {Object} data - Данные для уведомления
	 * @returns {string}
	 */
	static withdrawalAdminNotification(t, data) {
		return t('referral.withdrawal.admin_notification', {
			ns: 'message',
			username: data.username,
			userId: data.userId,
			amount: data.amount,
			referrals: data.referrals,
			withdrawalId: data.withdrawalId,
		});
	}

	/**
	 * История выводов средств
	 * @param {Function} t - Функция перевода
	 * @param {Array} withdrawals - Список выводов
	 * @returns {string}
	 */
	static withdrawalHistory(t, withdrawals) {
		if (!withdrawals || withdrawals.length === 0) {
			return t('referral.withdrawal.no_history', { ns: 'message' });
		}

		const statusIcons = {
			pending: '⏳',
			completed: '✅',
			rejected: '❌'
		};

		const withdrawalsList = withdrawals.map(w => {
			const icon = statusIcons[w.status] || '❓';
			const statusKey = `referral.withdrawal.status.${w.status}`;
			const status = t(statusKey, { ns: 'message' });
			const date = new Date(w.requested_at).toLocaleDateString();

			return `${icon} ${w.amount} ⭐ - ${status} (${date})`;
		});

		return [
			`<b>${t('referral.withdrawal.history_title', { ns: 'message' })}</b>`,
			'',
			...withdrawalsList,
		].join('\n');
	}

	/**
	 * Приветственное сообщение для реферала
	 * @param {Function} t - Функция перевода
	 * @param {string} referrerName - Имя реферера
	 * @returns {string}
	 */
	static welcomeReferral(t, referrerName) {
		return t('referral.welcome_referral', {
			ns: 'message',
			referrerName,
		});
	}
}

module.exports = ReferralMessages;
