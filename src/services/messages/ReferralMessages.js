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
	static menu(t, stats, tonEquivalent = null, tonWallet = null) {
		const howItWorks = t('referral.how_it_works', { ns: 'message' });
		const howItWorksList = Array.isArray(howItWorks)
			? howItWorks.map((item, i) => `${i + 1}. ${item}`)
			: [`1. ${howItWorks}`];

		const availableLine = tonEquivalent !== null
			? `✅ ${t('referral.stats.available_for_withdrawal', { ns: 'message' })}: <b>${stats.availableForWithdrawal} ⭐ ≈ ${tonEquivalent} GRAM</b>`
			: `✅ ${t('referral.stats.available_for_withdrawal', { ns: 'message' })}: <b>${stats.availableForWithdrawal} ⭐</b>`;

		const walletLine = tonWallet
			? `💎 ${t('referral.stats.ton_wallet', { ns: 'message' })}: <code>${tonWallet}</code>`
			: `💎 ${t('referral.stats.ton_wallet_not_set', { ns: 'message' })}`;

		return [
			`<b>${t('referral.title', { ns: 'message' })}</b>`,
			t('referral.description', { ns: 'message' }),
			'',
			`📊 <b>${t('referral.stats.title', { ns: 'message' })}:</b>`,
			`👥 ${t('referral.stats.total_referrals', { ns: 'message' })}: <b>${stats.totalReferrals}</b>`,
			`💰 ${t('referral.stats.total_earned', { ns: 'message' })}: <b>${stats.totalEarned} ⭐</b>`,
			`💸 ${t('referral.stats.total_withdrawn', { ns: 'message' })}: <b>${stats.totalWithdrawn} ⭐</b>`,
			availableLine,
			`⏳ ${t('referral.stats.pending_amount', { ns: 'message' })}: <b>${stats.pendingAmount} ⭐</b>`,
			walletLine,
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
	static withdrawalConfirm(t, amount, tonAmount = null, tonWallet = null) {
		const tonLine = tonAmount
			? `\n💎 К получению: <b>${tonAmount} GRAM</b>\n📬 Кошелёк: <code>${tonWallet}</code>`
			: '';
		return t('referral.withdrawal.confirm', { ns: 'message', amount }) + tonLine;
	}

	static setWalletPrompt(t) {
		return t('referral.withdrawal.set_wallet_prompt', { ns: 'message' });
	}

	/**
	 * Успешный запрос на вывод средств
	 * @param {Function} t - Функция перевода
	 * @param {number} amount - Сумма вывода
	 * @returns {string}
	 */
	static withdrawalSuccess(t, amount, tonAmount = null) {
		const base = t('referral.withdrawal.success', { ns: 'message', amount });
		return tonAmount
			? base + `\n\n💎 К выплате: <b>${tonAmount} GRAM</b>`
			: base;
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
		const base = t('referral.withdrawal.admin_notification', {
			ns: 'message',
			username: data.username,
			userId: data.userId,
			amount: data.amount,
			referrals: data.referrals,
			withdrawalId: data.withdrawalId,
		});
		const tonInfo = data.tonAmount
			? `\n💎 GRAM к выплате: <b>${data.tonAmount} GRAM</b>\n📬 Кошелёк: <code>${data.tonWallet}</code>`
			: '';
		return base + tonInfo;
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
