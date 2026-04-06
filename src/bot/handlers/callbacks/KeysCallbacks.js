const { KeyMessages } = require('../../../services/messages');
const KeyboardUtils = require('../../../utils/keyboards');
const { ADMIN_IDS } = require('../../../config/constants');

class KeysCallbacks {
	constructor(database, paymentService, keyService) {
		this.db = database;
		this.paymentService = paymentService;
		this.keyService = keyService;
	}

	async handleMyKeys(ctx) {
		const t = ctx.i18n.t;

		try {
			let user = await this.db.getUserByTelegramId(ctx.from.id);
			if (!user) {
				const message = KeyMessages.myKeys(t, []);
				const isAdmin = ADMIN_IDS.includes(ctx.from.id);
				const keyboard = KeyboardUtils.createMainMenu(t, isAdmin);
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
				return;
			}

			const keys = await this.keyService.getUserActiveKeys(t, user.id);
			const pendingKeys = await this.keyService.getUserPendingKeys(t, user.id);

			if (keys.length === 0 && pendingKeys.length === 0) {
				const message = KeyMessages.myKeys(t, []);
				const keyboard = KeyboardUtils.createKeysKeyboard(t, []);
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
				return;
			}

			let message = '';

			if (keys.length > 0) {
				message += `📋 <b>${t('keys.active_list', { ns: 'message' })}</b>\n\n`;

				for (let i = 0; i < keys.length; i++) {
					const sub = keys[i];
					const usage = await this.keyService.getUsageStats(sub.id);

					message += `${i + 1}. ${sub.plan?.displayName || sub.plan_id}\n`;
					message += `   • ${t('common.status')}: ${sub.status === 'active' ? t('keys.status_active', { ns: 'message' }) : t('keys.status_inactive', { ns: 'message' })}\n`;

					if (usage) {
						if (usage.limit > 0) {
							message += `   • ${t('common.used')}: ${usage.formattedUsed} ${t('common.of')} ${usage.formattedLimit} (${usage.usagePercentage}%)\n`;
						} else {
							message += `   • ${t('common.used')}: ${usage.formattedUsed}\n`;
						}
						message += `   • ${t('common.days_left')}: ${usage.daysRemaining}\n`;
					}

					message += `   • ${t('common.valid_until')}: ${new Date(sub.expires_at).toLocaleDateString()}\n\n`;
				}
			}

			if (pendingKeys.length > 0) {
				message += `⏳ <b>${t('keys.pending_list', { ns: 'message' })}</b>\n\n`;

				for (const pk of pendingKeys) {
					const planName = pk.plan?.displayName || pk.plan_id;
					message += `• ${planName} — ${t('keys.pending_status', { ns: 'message' })}\n`;
				}
				message += '\n';
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
			message += `📦 ${t('common.plan')}: ${key.plan?.displayName || key.plan_id}\n`;
			message += `🟢 ${t('common.status')}: ${key.status === 'active' ? t('keys.status_active', { ns: 'message' }) : t('keys.status_inactive', { ns: 'message' })}\n\n`;

			if (key.usage) {
				const usage = key.usage;
				message += `📊 <b>${t('keys.usage_title', { ns: 'message' })}</b>\n`;
				if (usage.limit > 0) {
					message += `• ${t('common.used')}: ${usage.formattedUsed} (${usage.usagePercentage}%)\n`;
					message += `• ${t('common.limit')}: ${usage.formattedLimit}\n`;
					message += `• ${t('common.remaining')}: ${usage.formattedRemaining}\n`;
				} else {
					message += `• ${t('common.used')}: ${usage.formattedUsed}\n`;
				}
				message += `• ${t('keys.days_until_expiry', { ns: 'message' })}: ${usage.daysRemaining}\n\n`;
			}

			if (key.access_url) {
				message += `🔐 <b>${t('keys.access_key_title', { ns: 'message' })}</b>\n`;
				message += `<code>${key.access_url}</code>\n\n`;
				message += `📱 <b>${t('keys.how_to_connect', { ns: 'message' })}</b>\n`;
				const steps = t('keys.connect_steps', { ns: 'message' });
				steps.forEach((step, i) => {
					message += `${i + 1}. ${step}\n`;
				});
			}

			const keyboard = KeyboardUtils.createKeyDetailsKeyboard(t, keyId);

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

			if (usage.limit > 0) {
				const progressBar = this.createProgressBar(usage.usagePercentage);
				message += `📈 ${progressBar} ${usage.usagePercentage}%\n\n`;
				message += `📥 ${t('common.used')}: ${usage.formattedUsed}\n`;
				message += `📦 ${t('common.limit')}: ${usage.formattedLimit}\n`;
				message += `📤 ${t('common.remaining')}: ${usage.formattedRemaining}\n\n`;
			} else {
				message += `📥 ${t('common.used')}: ${usage.formattedUsed}\n\n`;
			}
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

			const keyboard = KeyboardUtils.createKeyStatsKeyboard(t, keyId);

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

	async handleRefreshKey(ctx, keyId) {
		const t = ctx.i18n.t;

		try {
			await ctx.answerCbQuery(t('keys.refreshing', { ns: 'message' }));
			const newAccessUrl = await this.keyService.refreshAccessUrl(keyId);

			const keyboard = KeyboardUtils.createKeyStatsKeyboard(t, keyId);
			await ctx.editMessageText(
				`🔄 <b>${t('keys.refresh_success', { ns: 'message' })}</b>\n\n<code>${newAccessUrl}</code>`,
				{ ...keyboard, parse_mode: 'HTML' }
			);
		} catch (error) {
			console.error('Ошибка обновления ключа:', error);
			await ctx.answerCbQuery(t('generic.default', { ns: 'error' }), { show_alert: true });
		}
	}

	createProgressBar(percentage, length = 10) {
		const filled = Math.round((percentage / 100) * length);
		const empty = length - filled;
		return '█'.repeat(filled) + '░'.repeat(empty);
	}
}

module.exports = KeysCallbacks;
