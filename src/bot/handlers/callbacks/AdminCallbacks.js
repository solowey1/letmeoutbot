const { ADMIN_IDS, CALLBACK_ACTIONS } = require('../../../config/constants');
const { sendTon } = require('../../../services/TonService');
const { Markup } = require('telegraf');
const KeyboardUtils = require('../../../utils/keyboards');
const { btn } = require('../../../utils/keyboards/common');
const { AdminMessages } = require('../../../services/messages');
const pendingBroadcast = require('../../../utils/broadcastState');

class AdminCallbacks {
	constructor(database, paymentService, keysService, broadcastCallbacks = null) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.broadcastCallbacks = broadcastCallbacks;
	}

	async handleAdminPanel(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		const keyboard = KeyboardUtils.createAdminKeyboard(t);
		const message = AdminMessages.adminPanel(t);

		try {
			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (error) {
			// Игнорируем ошибку "message is not modified"
			if (error.description && error.description.includes('message is not modified')) {
				console.log('Админ-панель: сообщение не изменилось');
			} else {
				console.error('Ошибка редактирования сообщения админ-панели:', error);
			}
		}
	}

	async handleAdminUsers(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const users = await this.db.getAllUsers(10);
			const message = AdminMessages.usersList(t, users);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				// Игнорируем ошибку "message is not modified" от Telegram
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Сообщение не изменилось, пропускаем обновление');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения пользователей:', error);
			console.error('Детали ошибки:', error.message, error.stack);

			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				// Если не можем отредактировать сообщение, просто логируем
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminStats(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const stats = await this.db.getStats();

			// Normalize stats object (SupabaseDatabase returns snake_case, others return camelCase)
			const normalizedStats = {
				totalUsers: stats.totalUsers || stats.total_users || 0,
				activeKeys: stats.activeKeys || stats.active_keys || 0,
				totalRevenue: stats.totalRevenue || stats.total_revenue || 0,
				successfulPayments: stats.totalPayments || stats.total_payments || 0
			};

			const message = AdminMessages.stats(t, normalizedStats);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Статистика: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения статистики:', error);
			console.error('Детали ошибки:', error.message);

			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminPayments(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const payments = await this.db.getRecentPayments(20);
			const message = AdminMessages.paymentsList(t, payments);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Платежи: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения платежей:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminKeys(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const keys = await this.db.getAllActiveKeys();
			const message = AdminMessages.keysList(t, keys);
			const keyboard = KeyboardUtils.createAdminKeyboard(t);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Ключи: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения ключей:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleAdminPendingKeys(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const pendingKeys = await this.db.getPendingKeys(20);
			const message = await AdminMessages.pendingKeysList(t, pendingKeys, (userId) => this.db.getUserById(userId));

			// Кнопки для повторной активации каждого pending ключа
			const buttons = pendingKeys.map(key =>
				[{
					...Markup.button.callback(
						t('buttons.admin.activate_key', { id: key.id }),
						`${CALLBACK_ACTIONS.ADMIN.KEYS.RETRY_ACTIVATE}_${key.id}`
					),
					icon_custom_emoji_id: '5850346984501680054'
				}]
			);
			buttons.push([btn(t, 'back', CALLBACK_ACTIONS.ADMIN.MENU)]);
			const keyboard = Markup.inlineKeyboard(buttons);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Pending ключи: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения pending ключей:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (editError) {
				console.error('Не удалось отредактировать сообщение об ошибке:', editError.message);
			}
		}
	}

	async handleRetryActivateKey(ctx, keyId) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			await ctx.answerCbQuery(t('admin.pending_keys.activating', { ns: 'message' }));
			const result = await this.keysService.retryActivateKey(keyId);

			// Уведомляем пользователя через Telegram на его языке
			if (result.key) {
				try {
					const user = await this.db.getUserById(result.key.user_id);
					if (user) {
						const savedLocale = ctx.i18n.locale;
						ctx.i18n.locale = user.language || 'ru';
						const ut = ctx.i18n.t;

						const isProxy = result.key.key_type === 'mtproto';
						const label = isProxy
							? ut('proxy.link_label', { ns: 'message' })
							: ut('admin.pending_keys.vless_label', { ns: 'message' });

						let msg = `<b>${ut('admin.pending_keys.activated_title', { ns: 'message' })}</b>\n\n`;
						msg += `<b>${label}</b>\n<code>${result.accessUrl}</code>\n\n`;
						await ctx.telegram.sendMessage(user.telegram_id, msg, { parse_mode: 'HTML' });

						if (!isProxy) {
							try {
								const { generateQR } = require('../../../utils/qr');
								const qrBuffer = await generateQR(result.accessUrl);
								await ctx.telegram.sendPhoto(user.telegram_id, {
									source: qrBuffer, filename: 'vpn-qr.png'
								}, { caption: ut('payments.qr_caption', { ns: 'message' }) });
							} catch (qrErr) {
								console.error('⚠️ Не удалось отправить QR-код:', qrErr.message);
							}
						}

						ctx.i18n.locale = savedLocale;
					}
				} catch (notifyError) {
					console.error('⚠️ Не удалось уведомить пользователя:', notifyError.message);
				}
			}

			// Обновляем список pending ключей
			await this.handleAdminPendingKeys(ctx);
		} catch (error) {
			console.error('❌ Ошибка активации ключа:', error);
			await ctx.answerCbQuery(t('admin.pending_keys.activate_error', { ns: 'message', error: error.message }), { show_alert: true });
		}
	}

	async handleAdminBroadcast(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		const keyboard = KeyboardUtils.createBroadcastAudienceKeyboard(t);
		const message = t('admin.broadcast.select_audience', { ns: 'message' });

		try {
			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (editError) {
			if (editError.description && editError.description.includes('message is not modified')) {
				console.log('Рассылка: сообщение не изменилось');
			} else {
				console.error('Ошибка редактирования сообщения рассылки:', editError.message);
			}
		}
	}

	async handleBroadcastAudience(ctx, audience) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		pendingBroadcast.set(ctx.from.id, { audience });

		await ctx.reply(t('admin.broadcast.prompt', { ns: 'message' }));
	}

	async handleAdminSettings(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		const message = [
			`⚙️ <b>${t('admin.settings.title', { ns: 'message' })}</b>`,
			'',
			t('admin.settings.description', { ns: 'message' })
		].join('\n');

		const keyboard = KeyboardUtils.createAdminKeyboard(t);

		try {
			await ctx.editMessageText(message, {
				...keyboard,
				parse_mode: 'HTML'
			});
		} catch (editError) {
			if (editError.description && editError.description.includes('message is not modified')) {
				console.log('Настройки: сообщение не изменилось');
			} else {
				console.error('Ошибка редактирования настроек:', editError.message);
			}
		}
	}

	async handlePendingWithdrawals(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const withdrawals = await this.db.getPendingWithdrawals();
			const message = await AdminMessages.pendingWithdrawalsList(
				t,
				withdrawals,
				this.db.getUserById.bind(this.db)
			);
			const keyboard = KeyboardUtils.createWithdrawalListKeyboard(t, withdrawals);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Выплаты: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения pending выплат:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (_) {}
		}
	}

	async handleViewWithdrawal(ctx, withdrawalId) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCbQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}

			const user = await this.db.getUserById(withdrawal.user_id);
			const message = AdminMessages.withdrawalDetail(t, withdrawal, user);
			const keyboard = KeyboardUtils.createWithdrawalAdminKeyboard(t, withdrawalId);

			try {
				await ctx.editMessageText(message, {
					...keyboard,
					parse_mode: 'HTML'
				});
			} catch (editError) {
				if (editError.description && editError.description.includes('message is not modified')) {
					console.log('Детали выплаты: сообщение не изменилось');
				} else {
					throw editError;
				}
			}
		} catch (error) {
			console.error('Ошибка получения выплаты:', error);
			try {
				await ctx.editMessageText(
					t('admin.loading_error', { ns: 'message' }),
					KeyboardUtils.createAdminKeyboard(t)
				);
			} catch (_) {}
		}
	}

	async handleApproveWithdrawal(ctx, withdrawalId) {
		const t = ctx.i18n.t;
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCbQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCbQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
				return;
			}

			const user = await this.db.getUserById(withdrawal.user_id);
			const telegramId = user?.telegram_id;
			const tonAmount = withdrawal.ton_amount;
			// Используем кошелёк из запроса, или текущий кошелёк пользователя
			const tonWallet = withdrawal.ton_wallet || user?.ton_wallet;

			// Если есть кошелёк и сумма — пробуем автоматически отправить TON
			if (tonWallet && tonAmount) {
				let txHash = null;
				let txError = null;
				try {
					txHash = await sendTon(tonWallet, tonAmount);
				} catch (err) {
					txError = err.message;
					console.error('Ошибка отправки TON:', err);
				}

				if (txHash) {
					// Автоматическая выплата прошла успешно
					await this.db.updateWithdrawalStatus(withdrawalId, 'completed', ctx.from.id, null, txHash);

					const adminNote = [
						t('admin.withdrawals.approve_note', { ns: 'message', id: withdrawalId, userId: telegramId, stars: withdrawal.amount }),
						t('admin.withdrawals.approve_note_ton', { ns: 'message', amount: tonAmount }),
						t('admin.withdrawals.ton_sent', { ns: 'message', txHash }),
					].join('\n');
					await ctx.editMessageText(adminNote, { parse_mode: 'HTML' });

					try {
						await ctx.telegram.sendMessage(
							telegramId,
							t('admin.withdrawals.user_approved_ton', { ns: 'message', amount: tonAmount, txHash }),
							{ parse_mode: 'HTML' }
						);
					} catch (_) {}
					return;
				}

				// Ошибка отправки — просим подтвердить вручную
				const manualKeyboard = KeyboardUtils.createWithdrawalManualConfirmKeyboard(t, withdrawalId);
				const prompt = t('admin.withdrawals.manual_confirm_ton_error', {
					ns: 'message',
					error: txError,
					wallet: tonWallet,
					stars: withdrawal.amount,
					tonAmount: tonAmount,
				});
				await ctx.editMessageText(prompt, { ...manualKeyboard, parse_mode: 'HTML' });
				return;
			}

			// Нет кошелька или суммы — запрашиваем ручное подтверждение
			const manualKeyboard = KeyboardUtils.createWithdrawalManualConfirmKeyboard(t, withdrawalId);
			const prompt = tonWallet
				? t('admin.withdrawals.manual_confirm_wallet', { ns: 'message', wallet: tonWallet, stars: withdrawal.amount })
				: t('admin.withdrawals.manual_confirm_no_wallet', { ns: 'message', stars: withdrawal.amount });
			await ctx.editMessageText(prompt, { ...manualKeyboard, parse_mode: 'HTML' });
		} catch (error) {
			console.error('Ошибка подтверждения выплаты:', error);
			await ctx.answerCbQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleManualPaid(ctx, withdrawalId) {
		const t = ctx.i18n.t;
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCbQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCbQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
				return;
			}

			const user = await this.db.getUserById(withdrawal.user_id);
			const telegramId = user?.telegram_id;

			await this.db.updateWithdrawalStatus(withdrawalId, 'completed', ctx.from.id, 'manual');

			const adminNote = t('admin.withdrawals.manual_paid_note', {
				ns: 'message',
				id: withdrawalId,
				userId: telegramId,
				stars: withdrawal.amount,
			});
			await ctx.editMessageText(adminNote, { parse_mode: 'HTML' });

			try {
				await ctx.telegram.sendMessage(
					telegramId,
					t('admin.withdrawals.user_approved_manual_done', { ns: 'message', stars: withdrawal.amount }),
					{ parse_mode: 'HTML' }
				);
			} catch (_) {}
		} catch (error) {
			console.error('Ошибка подтверждения ручной выплаты:', error);
			await ctx.answerCbQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleManualUnpaid(ctx, withdrawalId) {
		const t = ctx.i18n.t;
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCbQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCbQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
				return;
			}

			const user = await this.db.getUserById(withdrawal.user_id);
			const telegramId = user?.telegram_id;

			await this.db.updateWithdrawalStatus(withdrawalId, 'rejected', ctx.from.id, 'manual_unpaid');

			const adminNote = t('admin.withdrawals.manual_unpaid_note', {
				ns: 'message',
				id: withdrawalId,
				userId: telegramId,
				stars: withdrawal.amount,
			});
			await ctx.editMessageText(adminNote, { parse_mode: 'HTML' });

			try {
				await ctx.telegram.sendMessage(
					telegramId,
					t('admin.withdrawals.user_rejected', { ns: 'message', stars: withdrawal.amount })
				);
			} catch (_) {}
		} catch (error) {
			console.error('Ошибка отклонения ручной выплаты:', error);
			await ctx.answerCbQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleRejectWithdrawal(ctx, withdrawalId) {
		const t = ctx.i18n.t;
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCbQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCbQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCbQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
				return;
			}

			await this.db.updateWithdrawalStatus(withdrawalId, 'rejected', ctx.from.id);

			const user = await this.db.getUserById(withdrawal.user_id);
			const telegramId = user?.telegram_id;
			const amount = withdrawal.amount;

			const adminNote = t('admin.withdrawals.reject_note', { ns: 'message', id: withdrawalId, userId: telegramId, stars: amount });
			await ctx.editMessageText(adminNote, { parse_mode: 'HTML' });

			try {
				await ctx.telegram.sendMessage(
					telegramId,
					t('admin.withdrawals.user_rejected', { ns: 'message', stars: amount })
				);
			} catch (_) {}
		} catch (error) {
			console.error('Ошибка отклонения выплаты:', error);
			await ctx.answerCbQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleBroadcast(ctx) {
		if (this.broadcastCallbacks) {
			return this.broadcastCallbacks.handleBroadcastMenu(ctx);
		}

		await ctx.answerCbQuery('Broadcast functionality not available');
	}
}

module.exports = AdminCallbacks;
