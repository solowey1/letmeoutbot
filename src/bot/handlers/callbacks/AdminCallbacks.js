const { InputFile } = require('grammy');
const { ADMIN_IDS, CALLBACK_ACTIONS } = require('../../../config/constants');
const { sendTon } = require('../../../services/TonService');
const { Markup } = require('../../../utils/markup');
const KeyboardUtils = require('../../../utils/keyboards');
const MTProtoService = require('../../../services/MTProtoService');
const { btn } = require('../../../utils/keyboards/common');
const { AdminMessages, KeyMessages } = require('../../../services/messages');
const pendingBroadcast = require('../../../utils/broadcastState');
const adminEditState = require('../../../utils/adminEditState');
const PlanService = require('../../../services/PlanService');

class AdminCallbacks {
	constructor(database, paymentService, keysService, broadcastCallbacks = null, settingsService = null) {
		this.db = database;
		this.paymentService = paymentService;
		this.keysService = keysService;
		this.broadcastCallbacks = broadcastCallbacks;
		this.settingsService = settingsService;
	}

	async handleAdminPanel(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			// На callback уже ответил роутер; повторный ответ Telegram отклоняет
			await ctx.answerCallbackQuery(t('admin.pending_keys.activating', { ns: 'message' })).catch(() => {});
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

						let msg = `<b>${ut('admin.pending_keys.activated_title', { ns: 'message' })}</b>\n\n`;
						const sendOptions = { parse_mode: 'HTML', disable_web_page_preview: true };
						if (isProxy) {
							msg += `🔗 <a href="${result.accessUrl}">${ut('proxy.open_link', { ns: 'message' })}</a>\n\n`;
							const manualValues = KeyMessages.proxyManualValues(ut, result.accessUrl);
							if (manualValues) msg += `${manualValues}\n\n`;
							msg += ut('proxy.how_to_add.short', { ns: 'message' });

							const tgLink = MTProtoService.toTgLink(result.accessUrl);
							Object.assign(sendOptions, KeyboardUtils.createProxyConnectKeyboard(ut, tgLink));
						} else {
							msg += `<b>${ut('admin.pending_keys.vless_label', { ns: 'message' })}</b>\n<code>${result.accessUrl}</code>\n\n`;
						}
						await ctx.api.sendMessage(user.telegram_id, msg, sendOptions);

						if (!isProxy) {
							try {
								const { generateQR } = require('../../../utils/qr');
								const qrBuffer = await generateQR(result.accessUrl);
								await ctx.api.sendPhoto(
									user.telegram_id,
									new InputFile(qrBuffer, 'vpn-qr.png'),
									{ caption: ut('payments.qr_caption', { ns: 'message' }) }
								);
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
			// answerCallbackQuery здесь бесполезен — на query уже ответили,
			// поэтому показываем ошибку отдельным сообщением
			await ctx.reply(t('admin.pending_keys.activate_error', { ns: 'message', error: error.message })).catch(() => {});
		}
	}

	async handleAdminBroadcast(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		pendingBroadcast.set(ctx.from.id, { audience });

		await ctx.reply(t('admin.broadcast.prompt', { ns: 'message' }));
	}

	// ============== НАСТРОЙКИ: ПРОДАЖИ И ТАРИФЫ ==============

	/** editMessageText, для которого «message is not modified» — не ошибка */
	async _edit(ctx, message, keyboard) {
		try {
			await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
		} catch (editError) {
			if (editError.description && editError.description.includes('message is not modified')) return;
			throw editError;
		}
	}

	async handleAdminSettings(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		adminEditState.delete(ctx.from.id);

		const message = [
			`⚙️ <b>${t('admin.settings.title', { ns: 'message' })}</b>`,
			'',
			t('admin.settings.sales_hint', { ns: 'message' })
		].join('\n');

		const keyboard = KeyboardUtils.createAdminSettingsKeyboard(t, {
			vpnSales: this.settingsService.get('vpn_sales_enabled'),
			proxySales: this.settingsService.get('proxy_sales_enabled')
		});

		try {
			await this._edit(ctx, message, keyboard);
		} catch (error) {
			console.error('Ошибка редактирования настроек:', error.message);
		}
	}

	async handleToggleSales(ctx, key) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const next = await this.settingsService.toggle(key);
			await ctx.answerCallbackQuery(
				t(next ? 'admin.settings.sales_enabled' : 'admin.settings.sales_disabled', { ns: 'message' })
			);
		} catch (error) {
			console.error('Ошибка переключения продаж:', error.message);
			await ctx.answerCallbackQuery(t('admin.loading_error', { ns: 'message' }), { show_alert: true });
			return;
		}

		await this.handleAdminSettings(ctx);
	}

	async handleAdminPlanList(ctx, type) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		adminEditState.delete(ctx.from.id);

		const plans = PlanService.getPlansForAdmin(type);
		const title = type === 'mtproto'
			? t('buttons.admin.plans_proxy')
			: t('buttons.admin.plans_vpn');

		const message = [
			`💰 <b>${title}</b>`,
			'',
			t('admin.settings.plans_hint', { ns: 'message' })
		].join('\n');

		try {
			await this._edit(ctx, message, KeyboardUtils.createAdminPlanListKeyboard(t, plans));
		} catch (error) {
			console.error('Ошибка списка тарифов:', error.message);
		}
	}

	async handleAdminPlanView(ctx, planId) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		const plan = PlanService.getPlanById(planId);
		if (!plan) {
			await ctx.answerCallbackQuery(t('keys.plan_not_found', { ns: 'error' }), { show_alert: true });
			return;
		}

		adminEditState.delete(ctx.from.id);

		try {
			await this._edit(ctx, AdminMessages.planDetails(t, plan), KeyboardUtils.createAdminPlanKeyboard(t, plan));
		} catch (error) {
			console.error('Ошибка карточки тарифа:', error.message);
		}
	}

	async handleAdminPlanEdit(ctx, planId, field) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		const plan = PlanService.getPlanById(planId);
		if (!plan) {
			await ctx.answerCallbackQuery(t('keys.plan_not_found', { ns: 'error' }), { show_alert: true });
			return;
		}

		adminEditState.set(ctx.from.id, { planId, field });

		const prompt = field === 'price'
			? t('admin.settings.enter_price', { ns: 'message', name: plan.name, current: plan.price })
			: t('admin.settings.enter_limit', { ns: 'message', name: plan.name, current: plan.dataLimitGB });

		try {
			await this._edit(ctx, prompt, KeyboardUtils.createAdminPlanCancelKeyboard(t, planId));
		} catch (error) {
			console.error('Ошибка запроса значения:', error.message);
		}
	}

	async handleAdminPlanToggle(ctx, planId) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		const plan = PlanService.getPlanById(planId);
		if (!plan) {
			await ctx.answerCallbackQuery(t('keys.plan_not_found', { ns: 'error' }), { show_alert: true });
			return;
		}

		const nextDisabled = !plan.disabled;
		try {
			await this.db.updatePlanFields(planId, { enabled: !nextDisabled });
			plan.disabled = nextDisabled;
			await ctx.answerCallbackQuery(
				t(nextDisabled ? 'admin.settings.plan_disabled' : 'admin.settings.plan_enabled', { ns: 'message' })
			);
		} catch (error) {
			console.error('Ошибка переключения тарифа:', error.message);
			await ctx.answerCallbackQuery(t('admin.loading_error', { ns: 'message' }), { show_alert: true });
			return;
		}

		await this.handleAdminPlanView(ctx, planId);
	}

	/**
	 * Применить введённое админом значение цены/лимита.
	 * Вызывается из MessageHandlers.
	 * @returns {{ok: boolean, plan?: object, error?: string}}
	 */
	async applyPlanEdit(planId, field, rawValue) {
		const plan = PlanService.getPlanById(planId);
		if (!plan) return { ok: false, error: 'not_found' };

		const value = Number(String(rawValue).trim().replace(',', '.'));
		if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'invalid' };

		if (field === 'price') {
			// Telegram Stars — целое число, минимум 1 за платный тариф
			const price = Math.round(value);
			if (price < 1) return { ok: false, error: 'invalid' };
			await this.db.updatePlanFields(planId, { price });
			plan.price = price;
		} else {
			// Лимит вводится в ГБ, 0 = безлимит
			const bytes = Math.round(value * 1024 * 1024 * 1024);
			await this.db.updatePlanFields(planId, { data_limit: bytes });
			PlanService.applyDataLimit(plan, bytes);
		}

		return { ok: true, plan };
	}

	async handlePendingWithdrawals(ctx) {
		const t = ctx.i18n.t;

		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
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
			await ctx.answerCallbackQuery(AdminMessages.accessDenied(t));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCallbackQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
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
			await ctx.answerCallbackQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCallbackQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCallbackQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
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
						await ctx.api.sendMessage(
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
			await ctx.answerCallbackQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleManualPaid(ctx, withdrawalId) {
		const t = ctx.i18n.t;
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCallbackQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCallbackQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
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
				await ctx.api.sendMessage(
					telegramId,
					t('admin.withdrawals.user_approved_manual_done', { ns: 'message', stars: withdrawal.amount }),
					{ parse_mode: 'HTML' }
				);
			} catch (_) {}
		} catch (error) {
			console.error('Ошибка подтверждения ручной выплаты:', error);
			await ctx.answerCallbackQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleManualUnpaid(ctx, withdrawalId) {
		const t = ctx.i18n.t;
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCallbackQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCallbackQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
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
				await ctx.api.sendMessage(
					telegramId,
					t('admin.withdrawals.user_rejected', { ns: 'message', stars: withdrawal.amount })
				);
			} catch (_) {}
		} catch (error) {
			console.error('Ошибка отклонения ручной выплаты:', error);
			await ctx.answerCallbackQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleRejectWithdrawal(ctx, withdrawalId) {
		const t = ctx.i18n.t;
		if (!ADMIN_IDS.includes(ctx.from.id)) {
			await ctx.answerCallbackQuery(t('admin.withdrawals.no_access', { ns: 'message' }));
			return;
		}

		try {
			const withdrawal = await this.db.getWithdrawal(withdrawalId);
			if (!withdrawal) {
				await ctx.answerCallbackQuery(t('admin.withdrawals.not_found', { ns: 'message' }));
				return;
			}
			if (withdrawal.status !== 'pending') {
				await ctx.answerCallbackQuery(t('admin.withdrawals.already_processed', { ns: 'message' }));
				return;
			}

			await this.db.updateWithdrawalStatus(withdrawalId, 'rejected', ctx.from.id);

			const user = await this.db.getUserById(withdrawal.user_id);
			const telegramId = user?.telegram_id;
			const amount = withdrawal.amount;

			const adminNote = t('admin.withdrawals.reject_note', { ns: 'message', id: withdrawalId, userId: telegramId, stars: amount });
			await ctx.editMessageText(adminNote, { parse_mode: 'HTML' });

			try {
				await ctx.api.sendMessage(
					telegramId,
					t('admin.withdrawals.user_rejected', { ns: 'message', stars: amount })
				);
			} catch (_) {}
		} catch (error) {
			console.error('Ошибка отклонения выплаты:', error);
			await ctx.answerCallbackQuery(t('admin.withdrawals.processing_error', { ns: 'message' }));
		}
	}

	async handleBroadcast(ctx) {
		if (this.broadcastCallbacks) {
			return this.broadcastCallbacks.handleBroadcastMenu(ctx);
		}

		await ctx.answerCallbackQuery('Broadcast functionality not available');
	}
}

module.exports = AdminCallbacks;
