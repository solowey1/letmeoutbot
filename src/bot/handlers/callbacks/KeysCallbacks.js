const { KeyMessages } = require('../../../services/messages');
const KeyboardUtils = require('../../../utils/keyboards');

class KeysCallbacks {
	constructor(database, paymentService, keyService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keyService = keyService;
	}

	async handleMyKeys(ctx) {
		const t = ctx.i18n.t;

		try {
			let user = await this.db.getUser(ctx.from.id);
			if (!user) {
				const message = KeyMessages.myKeys(t, []);
				const keyboard = KeyboardUtils.createMainMenu(t);
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
				return;
			}

			const keys = await this.keyService.getUserActiveKeys(t, user.id);

			if (keys.length === 0) {
				const message = KeyMessages.myKeys(t, []);
				const keyboard = KeyboardUtils.createKeysKeyboard(t, []);
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
				return;
			}

			let message = `📋 <b>${t('keys.active_list', { ns: 'message' })}</b>\n\n`;

			for (let i = 0; i < keys.length; i++) {
				const sub = keys[i];
				const usage = await this.keyService.getUsageStats(sub.id);

				message += `${i + 1}. ${sub.plan.displayName}\n`;
				message += `   • ${t('common.status')}: ${sub.status === 'active' ? t('keys.status_active', { ns: 'message' }) : t('keys.status_inactive', { ns: 'message' })}\n`;

				if (usage) {
					message += `   • ${t('common.used')}: ${usage.formattedUsed} ${t('common.of')} ${usage.formattedLimit} (${usage.usagePercentage}%)\n`;
					message += `   • ${t('common.days_left')}: ${usage.daysRemaining}\n`;
				}

				message += `   • ${t('common.valid_until')}: ${new Date(sub.expires_at).toLocaleDateString()}\n\n`;
			}

			const keyboard = KeyboardUtils.createKeysKeyboard(t, keys);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения ключей:', error);
			await ctx.editMessageText(
				t('keys.no_keys', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}

	async handleKeyDetails(ctx, keyId) {
		const t = ctx.i18n.t;

		try {
			const key = await this.keyService.getKeyDetails(t, keyId, true);
			if (!key) {
				await ctx.editMessageText(
					t('keys.not_found', { ns: 'error' }),
					KeyboardUtils.createBackToMenuKeyboard(t)
				);
				return;
			}

			let message = `🔑 <b>${t('keys.details_title', { ns: 'message' })}</b>\n\n`;
			message += `📦 ${t('common.plan')}: ${key.plan.displayName}\n`;
			message += `🟢 ${t('common.status')}: ${key.status === 'active' ? t('keys.status_active', { ns: 'message' }) : t('keys.status_inactive', { ns: 'message' })}\n`;

			if (key.expires_at) {
				message += `📅 ${t('common.valid_until')}: ${new Date(key.expires_at).toLocaleDateString()}\n`;
			}

			if (key.usage) {
				const usage = key.usage;
				message += `\n📊 <b>${t('keys.usage_title', { ns: 'message' })}</b>\n`;
				message += `• ${t('common.used')}: ${usage.formattedUsed} (${usage.usagePercentage}%)\n`;
				message += `• ${t('common.limit')}: ${usage.formattedLimit}\n`;
				message += `• ${t('common.remaining')}: ${usage.formattedRemaining}\n`;
				message += `• ${t('keys.days_until_expiry', { ns: 'message' })}: ${usage.daysRemaining}\n`;
			}

			if (key.access_url) {
				message += `\n🔐 <b>${t('keys.access_key_title', { ns: 'message' })}</b>\n`;
				message += `<code>${key.access_url}</code>\n\n`;
				message += `📱 <b>${t('keys.how_to_connect', { ns: 'message' })}</b>\n`;
				const steps = t('keys.connect_steps', { ns: 'message' });
				steps.forEach((step, i) => {
					message += `${i + 1}. ${step}\n`;
				});
			}

			// Определяем текущий протокол из access_url (по умолчанию tcp)
			const protocol = key.protocol || 'tcp';
			const keyboard = KeyboardUtils.createKeyDetailsKeyboard(t, keyId, protocol);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения деталей ключа:', error);
			await ctx.editMessageText(
				t('generic.loading_error', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}

	async handleKeyStats(ctx, keyId) {
		const t = ctx.i18n.t;

		try {
			const usage = await this.keyService.getUsageStats(keyId);
			if (!usage) {
				await ctx.editMessageText(
					t('admin.stats_unavailable', { ns: 'error' }),
					KeyboardUtils.createBackToMenuKeyboard(t)
				);
				return;
			}

			let message = `📊 <b>${t('stats.title', { ns: 'message' })}</b>\n\n`;

			// Создаем визуальный индикатор прогресса
			const progressBar = this.createProgressBar(usage.usagePercentage);

			message += `📈 ${progressBar} ${usage.usagePercentage}%\n\n`;
			message += `📥 ${t('common.used')}: ${usage.formattedUsed}\n`;
			message += `📦 ${t('common.limit')}: ${usage.formattedLimit}\n`;
			message += `📤 ${t('common.remaining')}: ${usage.formattedRemaining}\n\n`;
			message += `⏰ ${t('common.days_left')}: ${usage.daysRemaining}\n`;

			if (usage.isOverLimit) {
				message += `\n🚨 <b>${t('stats.over_limit', { ns: 'message' })}</b>`;
			} else if (usage.usagePercentage > 90) {
				message += `\n⚠️ <b>${t('stats.warning_traffic', { ns: 'message' })}</b>`;
			}

			if (usage.isExpired) {
				message += `\n🕐 <b>${t('stats.key_expired', { ns: 'message' })}</b>`;
			} else if (usage.daysRemaining <= 3) {
				message += `\n⏰ <b>${t('stats.key_expiring_soon', { ns: 'message' })}</b>`;
			}

			const keyboard = KeyboardUtils.createKeyDetailsKeyboard(t, keyId);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка получения статистики:', error);
			await ctx.editMessageText(
				t('generic.loading_error', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}

	createProgressBar(percentage, length = 10) {
		const filled = Math.round((percentage / 100) * length);
		const empty = length - filled;
		return '█'.repeat(filled) + '░'.repeat(empty);
	}

	async handleChangePort(ctx, keyId) {
		const t = ctx.i18n.t;

		try {
			const key = await this.keyService.getKeyDetails(t, keyId, false);
			if (!key) {
				await ctx.editMessageText(
					t('keys.not_found', { ns: 'error' }),
					KeyboardUtils.createBackToMenuKeyboard(t)
				);
				return;
			}

			// Показываем уведомление о начале процесса
			await ctx.answerCbQuery(t('keys.port_changing', { ns: 'message' }));

			// Пересоздаем ключ (это даст новый порт/конфигурацию)
			const userTID = ctx.from.id;
			const recreatedKey = await this.keyService.recreateKey(keyId, userTID);

			// Получаем обновленную информацию о ключе
			const updatedKey = await this.keyService.getKeyDetails(t, keyId, true);

			let message = `🔄 <b>${t('keys.port_changed', { ns: 'message' })}</b>\n\n`;
			message += `🔐 <b>${t('keys.new_access_key', { ns: 'message' })}</b>\n`;
			message += `<code>${updatedKey.access_url}</code>\n\n`;
			message += `ℹ️ ${t('keys.port_change_hint', { ns: 'message' })}\n\n`;

			// Добавляем информацию о плане и сроке действия
			message += `📦 ${t('common.plan')}: ${updatedKey.plan.displayName}\n`;
			message += `📅 ${t('common.valid_until')}: ${new Date(updatedKey.expires_at).toLocaleDateString()}`;

			const protocol = updatedKey.protocol || 'tcp';
			const keyboard = KeyboardUtils.createKeyDetailsKeyboard(t, keyId, protocol);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			console.error('Ошибка смены порта:', error);
			await ctx.editMessageText(
				t('keys.port_change_error', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}

	async handleChangeProtocol(ctx, keyId, protocol) {
		const t = ctx.i18n.t;

		try {
			const key = await this.keyService.getKeyDetails(t, keyId, false);
			if (!key) {
				await ctx.editMessageText(
					t('keys.not_found', { ns: 'error' }),
					KeyboardUtils.createBackToMenuKeyboard(t)
				);
				return;
			}

			// Обновляем протокол в БД
			await this.keyService.updateKeyProtocol(keyId, protocol);

			// Показываем уведомление
			await ctx.answerCbQuery(t('keys.protocol_changed', { ns: 'message', args: { protocol: protocol.toUpperCase() } }));

			// Показываем обновленную информацию с выбранным протоколом
			await this.handleKeyDetails(ctx, keyId);
		} catch (error) {
			console.error('Ошибка смены протокола:', error);
			await ctx.editMessageText(
				t('generic.loading_error', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}
}

module.exports = KeysCallbacks;
