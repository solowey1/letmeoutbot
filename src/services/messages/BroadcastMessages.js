/**
 * Сервис для генерации сообщений рассылки
 */
class BroadcastMessages {
	/**
	 * Главная страница рассылки
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static mainMenu(t) {
		return [
			`📢 <b>${t('admin.broadcast.title', { ns: 'message' })}</b>`,
			'',
			t('admin.broadcast.description', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Выбор фильтра
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static selectFilter(t) {
		return [
			`🎯 <b>${t('admin.broadcast.select_filter', { ns: 'message' })}</b>`,
			'',
			t('admin.broadcast.filter_description', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Запрос текста сообщения
	 * @param {Function} t - Функция перевода
	 * @param {string} filterType - Тип фильтра
	 * @param {number} recipientsCount - Количество получателей
	 * @returns {string}
	 */
	static requestMessage(t, filterType, recipientsCount) {
		const filterName = this.getFilterName(t, filterType);

		return [
			`✍️ <b>${t('admin.broadcast.enter_message', { ns: 'message' })}</b>`,
			'',
			`📊 ${t('admin.broadcast.filter', { ns: 'message' })}: ${filterName}`,
			`👥 ${t('admin.broadcast.recipients_count', { ns: 'message' })}: ${recipientsCount}`,
			'',
			t('admin.broadcast.message_hint', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Подтверждение рассылки
	 * @param {Function} t - Функция перевода
	 * @param {string} messageText - Текст сообщения
	 * @param {string} filterType - Тип фильтра
	 * @param {number} recipientsCount - Количество получателей
	 * @param {Date} scheduledAt - Время отправки (null для немедленной)
	 * @returns {string}
	 */
	static selectLanguage(t, filterName, totalCount) {
		return [
			`🌐 <b>${t('admin.broadcast.select_language', { ns: 'message' })}</b>`,
			'',
			`📊 ${t('admin.broadcast.filter', { ns: 'message' })}: ${filterName}`,
			`👥 ${t('admin.broadcast.total_recipients', { ns: 'message' })}: ${totalCount}`,
			'',
			t('admin.broadcast.language_hint', { ns: 'message' })
		].join('\n');
	}

	static getLanguageName(t, languageFilter) {
		if (languageFilter === 'ru') return t('admin.broadcast.language_ru', { ns: 'message' });
		if (languageFilter === 'en') return t('admin.broadcast.language_en', { ns: 'message' });
		return t('admin.broadcast.language_all', { ns: 'message' });
	}

	static confirmBroadcast(t, messageText, filterType, recipientsCount, scheduledAt = null, languageFilter = null) {
		const filterName = this.getFilterName(t, filterType);
		const preview = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;

		const message = [
			`📋 <b>${t('admin.broadcast.confirm_title', { ns: 'message' })}</b>`,
			'',
			`📊 ${t('admin.broadcast.filter', { ns: 'message' })}: ${filterName}`,
			`🌐 ${t('admin.broadcast.language_label', { ns: 'message' })}: ${this.getLanguageName(t, languageFilter)}`,
			`👥 ${t('admin.broadcast.recipients_count', { ns: 'message' })}: ${recipientsCount}`,
			''
		];

		if (scheduledAt) {
			message.push(`⏰ ${t('admin.broadcast.scheduled_time', { ns: 'message' })}: ${scheduledAt.toLocaleString()}`);
			message.push('');
		}

		message.push(`💬 <b>${t('admin.broadcast.message_preview', { ns: 'message' })}:</b>`);
		message.push(`<i>${preview}</i>`);
		message.push('');
		message.push(t('admin.broadcast.confirm_question', { ns: 'message' }));

		return message.join('\n');
	}

	/**
	 * Рассылка запущена
	 * @param {Function} t - Функция перевода
	 * @param {number} broadcastId - ID рассылки
	 * @param {boolean} isScheduled - Отложенная или немедленная
	 * @returns {string}
	 */
	static broadcastStarted(t, broadcastId, isScheduled = false) {
		if (isScheduled) {
			return [
				`⏰ <b>${t('admin.broadcast.scheduled_success', { ns: 'message' })}</b>`,
				'',
				`🆔 ID: ${broadcastId}`,
				'',
				t('admin.broadcast.scheduled_hint', { ns: 'message' })
			].join('\n');
		}

		return [
			`✅ <b>${t('admin.broadcast.started', { ns: 'message' })}</b>`,
			'',
			`🆔 ID: ${broadcastId}`,
			'',
			t('admin.broadcast.progress_hint', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Статус рассылки
	 * @param {Function} t - Функция перевода
	 * @param {Object} broadcast - Объект рассылки
	 * @returns {string}
	 */
	static broadcastStatus(t, broadcast) {
		const statusEmoji = {
			pending: '⏳',
			in_progress: '🔄',
			completed: '✅',
			failed: '❌',
			cancelled: '🚫'
		};

		const status = statusEmoji[broadcast.status] || '❓';
		const filterName = this.getFilterName(t, broadcast.filter_type);

		const message = [
			`📊 <b>${t('admin.broadcast.status_title', { ns: 'message' })}</b>`,
			'',
			`🆔 ID: ${broadcast.id}`,
			`${status} ${t('admin.broadcast.status_label', { ns: 'message' })}: ${t(`admin.broadcast.status.${broadcast.status}`, { ns: 'message' })}`,
			`📊 ${t('admin.broadcast.filter', { ns: 'message' })}: ${filterName}`,
			`👥 ${t('admin.broadcast.total_recipients', { ns: 'message' })}: ${broadcast.total_recipients}`,
			`✅ ${t('admin.broadcast.sent', { ns: 'message' })}: ${broadcast.sent_count}`,
			`❌ ${t('admin.broadcast.failed', { ns: 'message' })}: ${broadcast.failed_count}`
		];

		if (broadcast.scheduled_at) {
			const scheduledDate = new Date(broadcast.scheduled_at);
			message.push(`⏰ ${t('admin.broadcast.scheduled_time', { ns: 'message' })}: ${scheduledDate.toLocaleString()}`);
		}

		if (broadcast.started_at) {
			const startedDate = new Date(broadcast.started_at);
			message.push(`🚀 ${t('admin.broadcast.started_at', { ns: 'message' })}: ${startedDate.toLocaleString()}`);
		}

		if (broadcast.completed_at) {
			const completedDate = new Date(broadcast.completed_at);
			message.push(`🏁 ${t('admin.broadcast.completed_at', { ns: 'message' })}: ${completedDate.toLocaleString()}`);
		}

		return message.join('\n');
	}

	/**
	 * История рассылок
	 * @param {Function} t - Функция перевода
	 * @param {Array} broadcasts - Массив рассылок
	 * @returns {string}
	 */
	static broadcastHistory(t, broadcasts) {
		if (!broadcasts || broadcasts.length === 0) {
			return [
				`📜 <b>${t('admin.broadcast.history_title', { ns: 'message' })}</b>`,
				'',
				t('admin.broadcast.no_history', { ns: 'message' })
			].join('\n');
		}

		const statusEmoji = {
			pending: '⏳',
			in_progress: '🔄',
			completed: '✅',
			failed: '❌',
			cancelled: '🚫'
		};

		const message = [
			`📜 <b>${t('admin.broadcast.history_title', { ns: 'message' })}</b>`,
			''
		];

		broadcasts.forEach(broadcast => {
			const status = statusEmoji[broadcast.status] || '❓';
			const date = new Date(broadcast.created_at).toLocaleString();
			const preview = broadcast.message_text.length > 50
				? broadcast.message_text.substring(0, 50) + '...'
				: broadcast.message_text;

			message.push(`${status} <b>ID ${broadcast.id}</b> | ${date}`);
			message.push(`   ${t('admin.broadcast.recipients_count', { ns: 'message' })}: ${broadcast.total_recipients} | ${t('admin.broadcast.sent', { ns: 'message' })}: ${broadcast.sent_count}`);
			message.push(`   <i>${preview}</i>`);
			message.push('');
		});

		return message.join('\n');
	}

	/**
	 * Запрос времени для отложенной рассылки
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static requestScheduleTime(t) {
		return [
			`⏰ <b>${t('admin.broadcast.schedule_time_title', { ns: 'message' })}</b>`,
			'',
			t('admin.broadcast.schedule_time_hint', { ns: 'message' }),
			'',
			t('admin.broadcast.schedule_time_format', { ns: 'message' })
		].join('\n');
	}

	/**
	 * Отмена рассылки
	 * @param {Function} t - Функция перевода
	 * @returns {string}
	 */
	static broadcastCancelled(t) {
		return `🚫 ${t('admin.broadcast.cancelled', { ns: 'message' })}`;
	}

	/**
	 * Ошибка рассылки
	 * @param {Function} t - Функция перевода
	 * @param {string} error - Описание ошибки
	 * @returns {string}
	 */
	static error(t, error = null) {
		const message = [
			`❌ ${t('admin.broadcast.error', { ns: 'message' })}`,
		];

		if (error) {
			message.push('');
			message.push(`<i>${error}</i>`);
		}

		return message.join('\n');
	}

	/**
	 * Получить название фильтра
	 * @param {Function} t - Функция перевода
	 * @param {string} filterType - Тип фильтра
	 * @returns {string}
	 */
	static getFilterName(t, filterType) {
		const filterNames = {
			all: t('admin.broadcast.filters.all', { ns: 'message' }),
			active_keys: t('admin.broadcast.filters.active_keys', { ns: 'message' }),
			expired_keys: t('admin.broadcast.filters.expired_keys', { ns: 'message' }),
			no_keys: t('admin.broadcast.filters.no_keys', { ns: 'message' }),
			paid_users: t('admin.broadcast.filters.paid_users', { ns: 'message' }),
			free_users: t('admin.broadcast.filters.free_users', { ns: 'message' }),
			language: t('admin.broadcast.filters.language', { ns: 'message' }),
			new_users: t('admin.broadcast.filters.new_users', { ns: 'message' }),
			old_users: t('admin.broadcast.filters.old_users', { ns: 'message' })
		};

		return filterNames[filterType] || filterType;
	}
}

module.exports = BroadcastMessages;
