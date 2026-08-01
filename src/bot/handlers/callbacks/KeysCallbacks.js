const { KeyMessages } = require('../../../services/messages');
const KeyboardUtils = require('../../../utils/keyboards');
const MTProtoService = require('../../../services/MTProtoService');
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
					const isProxy = sub.key_type === 'mtproto';
					const typeLabel = isProxy
						? t('keys.type_proxy', { ns: 'message' })
						: t('keys.type_vpn', { ns: 'message' });

					message += `${i + 1}. ${typeLabel}\n`;
					message += `   • ${t('common.status')}: ${sub.status === 'active' ? t('keys.status_active', { ns: 'message' }) : t('keys.status_inactive', { ns: 'message' })}\n`;
					message += `   • ${t('common.plan')}: ${sub.plan?.displayName || sub.plan_id}\n`;

					if (usage) {
						message += `   • ${t('common.days_left')}: ${usage.daysRemaining}\n`;
					}

					// Прокси отключается точно в срок — показываем и время
					const expires = new Date(sub.expires_at);
					const expiresStr = isProxy
						? `${expires.toLocaleDateString()}, ${expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
						: expires.toLocaleDateString();
					message += `   • ${t('common.valid_until')}: ${expiresStr}\n`;

					// Трафик прокси не считается — строка только для VPN
					if (!isProxy && usage) {
						if (usage.limit > 0) {
							message += `   • ${t('common.used')}: ${usage.formattedUsed} ${t('common.of')} ${usage.formattedLimit} (${usage.usagePercentage}%)\n`;
						} else {
							message += `   • ${t('common.used')}: ${usage.formattedUsed}\n`;
						}
					}

					message += '\n';
				}
			}

			if (pendingKeys.length > 0) {
				message += `⏳ <b>${t('keys.pending_list', { ns: 'message' })}</b>\n\n`;

				for (const pk of pendingKeys) {
					const planName = pk.plan?.displayName || pk.plan_id;
					const typeLabel = pk.key_type === 'mtproto'
						? t('keys.type_proxy', { ns: 'message' })
						: t('keys.type_vpn', { ns: 'message' });
					message += `• ${typeLabel} (${planName}) — ${t('keys.pending_status', { ns: 'message' })}\n`;
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
				if (key.key_type === 'mtproto') {
					message += `🔗 <a href="${key.access_url}">${t('proxy.open_link', { ns: 'message' })}</a>\n\n`;
					const manualValues = KeyMessages.proxyManualValues(t, key.access_url);
					if (manualValues) message += `${manualValues}\n\n`;
					message += t('proxy.how_to_add.short', { ns: 'message' });
				} else if (key.key_type === 'vless') {
					if (key.access_url.startsWith('http')) {
						message += `🔗 <b>${t('keys.subscription_title', { ns: 'message' })}</b>\n`;
						message += `<code>${key.access_url}</code>\n\n`;
						message += `💡 ${t('keys.subscription_hint', { ns: 'message' })}\n\n`;
						message += `📱 <b>${t('keys.subscription_how_to', { ns: 'message' })}</b>\n`;
						const steps = t('keys.subscription_steps', { ns: 'message' });
						steps.forEach((step, i) => { message += `${i + 1}. ${step}\n`; });
					} else {
						message += `⚡ <b>VLESS Reality:</b>\n<code>${key.access_url}</code>\n\n`;
						message += `📱 <b>${t('keys.how_to_connect', { ns: 'message' })}</b>\n`;
						const steps = t('keys.connect_steps', { ns: 'message' });
						steps.forEach((step, i) => { message += `${i + 1}. ${step}\n`; });
					}
				} else {
					// Ключ старого формата, который не удалось перевыпустить — показываем как есть
					message += `🔐 <b>${t('keys.access_key_title', { ns: 'message' })}</b>\n`;
					message += `<code>${key.access_url}</code>\n\n`;
					message += `📱 <b>${t('keys.how_to_connect', { ns: 'message' })}</b>\n`;
					const steps = t('keys.connect_steps', { ns: 'message' });
					steps.forEach((step, i) => { message += `${i + 1}. ${step}\n`; });
				}
			}

			// Для прокси — кнопка «Подключить» с tg://-ссылкой (один тап без браузера)
			const proxyTgLink = key.key_type === 'mtproto' && key.access_url
				? MTProtoService.toTgLink(key.access_url)
				: null;
			const keyboard = KeyboardUtils.createKeyDetailsKeyboard(t, keyId, key.key_type, proxyTgLink);

			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML',
				disable_web_page_preview: true
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
			const user = await this.db.getUserByTelegramId(ctx.from.id);
			const key = await this.db.getKey(keyId);
			if (!user || !key || key.user_id !== user.id) {
				await ctx.editMessageText(
					t('keys.not_found', { ns: 'error' }),
					KeyboardUtils.createBackToMenuKeyboard(t)
				);
				return;
			}

			await ctx.editMessageText(`⏳ ${t('keys.refreshing', { ns: 'message' })}`, { parse_mode: 'HTML' });

			const result = await this.keyService.refreshKey(keyId);

			let message = `✅ <b>${t('keys.refresh_success_title', { ns: 'message' })}</b>\n\n`;
			message += `🔗 <b>${t('keys.subscription_title', { ns: 'message' })}</b>\n`;
			message += `<code>${result.accessUrl}</code>\n\n`;
			message += `💡 ${t('keys.refresh_hint', { ns: 'message' })}`;

			// клавиатура с кнопками «Назад» (к деталям ключа) и «Домой»
			const keyboard = KeyboardUtils.createKeyStatsKeyboard(t, keyId);
			await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
		} catch (error) {
			console.error('Ошибка обновления ключа:', error);
			await ctx.editMessageText(
				t('keys.refresh_failed', { ns: 'error' }),
				KeyboardUtils.createBackToMenuKeyboard(t)
			);
		}
	}

	async handleRawVlessKey(ctx, keyId) {
		const t = ctx.i18n.t;

		try {
			const rawKeys = await this.keyService.getVlessRawKeys(keyId);

			let message = `🔑 <b>${t('keys.raw_vless_title', { ns: 'message' })}</b>\n\n`;

			if (rawKeys.vless.length > 0) {
				message += `⚡ <b>VLESS Reality:</b>\n<code>${rawKeys.vless[0]}</code>\n\n`;
			}
			if (rawKeys.hysteria2.length > 0) {
				message += `🚀 <b>Hysteria2:</b>\n<code>${rawKeys.hysteria2[0]}</code>\n\n`;
			}

			message += `💡 ${t('keys.raw_vless_hint', { ns: 'message' })}`;

			const keyboard = KeyboardUtils.createKeyDetailsKeyboard(t, keyId);
			await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
		} catch (error) {
			console.error('Ошибка получения отдельных ключей:', error);
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
}

module.exports = KeysCallbacks;
