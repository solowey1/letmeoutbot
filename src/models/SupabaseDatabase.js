const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Database Implementation using @supabase/supabase-js
 */
class SupabaseDatabase {
	constructor(supabaseUrl, supabaseKey) {
		if (!supabaseUrl || !supabaseKey) {
			throw new Error('Supabase URL and API key are required');
		}

		this.supabase = createClient(supabaseUrl, supabaseKey);
		console.log('✅ Supabase клиент инициализирован');
	}

	async init() {
		try {
			// Проверяем подключение простым запросом
			const { data, error } = await this.supabase
				.from('users')
				.select('count')
				.limit(1);

			if (error && error.code !== 'PGRST116') { // PGRST116 = empty table
				throw error;
			}

			console.log('✅ Подключение к Supabase установлено');
		} catch (error) {
			console.error('❌ Ошибка подключения к Supabase:', error.message);
			throw error;
		}
	}

	// ============== USERS ==============

	async createUser(telegramId, username, firstName, lastName = null) {
		const { data, error } = await this.supabase
			.from('users')
			.insert([{
				telegram_id: telegramId,
				username,
				first_name: firstName,
				last_name: lastName
			}])
			.select('id')
			.single();

		if (error) {
			// Если пользователь уже существует, получаем его ID
			if (error.code === '23505') { // unique violation
				const user = await this.getUser(telegramId);
				return user?.id || 0;
			}
			throw error;
		}

		return data.id;
	}

	async getUser(telegramId) {
		const { data, error } = await this.supabase
			.from('users')
			.select('*')
			.eq('telegram_id', telegramId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // not found
			throw error;
		}

		return data;
	}

	async getUserById(userId) {
		const { data, error } = await this.supabase
			.from('users')
			.select('*')
			.eq('id', userId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}

		return data;
	}

	async updateUser(telegramId, updates) {
		const { error } = await this.supabase
			.from('users')
			.update(updates)
			.eq('telegram_id', telegramId);

		if (error) throw error;
	}

	async getAllUsers() {
		const { data, error } = await this.supabase
			.from('users')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	// ============== KEYS ==============

	async createKey(userId, planId, dataLimit, expiresAt) {
		const { data, error } = await this.supabase
			.from('keys')
			.insert([{
				user_id: userId,
				plan_id: planId,
				data_limit: dataLimit,
				expires_at: expiresAt,
				status: 'pending'
			}])
			.select('id')
			.single();

		if (error) throw error;
		return data.id;
	}

	async getKey(keyId) {
		const { data, error } = await this.supabase
			.from('keys')
			.select('*')
			.eq('id', keyId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}

		return data;
	}

	async updateKey(keyId, updates) {
		const { error } = await this.supabase
			.from('keys')
			.update(updates)
			.eq('id', keyId);

		if (error) throw error;
	}

	async getActiveKeys(userId) {
		const { data, error } = await this.supabase
			.from('keys')
			.select('*')
			.eq('user_id', userId)
			.eq('status', 'active')
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	async getAllUserKeys(userId) {
		const { data, error } = await this.supabase
			.from('keys')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	async getPendingKeys(limit = 20) {
		const { data, error } = await this.supabase
			.from('keys')
			.select('*')
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data || [];
	}

	async getAllActiveKeys() {
		const { data, error } = await this.supabase
			.from('keys')
			.select('*')
			.eq('status', 'active')
			.gt('expires_at', new Date().toISOString());

		if (error) throw error;
		return data || [];
	}

	// ============== PAYMENTS ==============

	async createPayment(userId, planId, amount, currency = 'XTR') {
		const { data, error } = await this.supabase
			.from('payments')
			.insert([{
				user_id: userId,
				plan_id: planId,
				amount,
				currency,
				status: 'pending'
			}])
			.select('id')
			.single();

		if (error) throw error;
		return data.id;
	}

	async getPayment(paymentId) {
		const { data, error } = await this.supabase
			.from('payments')
			.select('*')
			.eq('id', paymentId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}

		return data;
	}

	async updatePayment(paymentId, updates) {
		const { error } = await this.supabase
			.from('payments')
			.update(updates)
			.eq('id', paymentId);

		if (error) throw error;
	}

	async getUserPayments(userId) {
		const { data, error } = await this.supabase
			.from('payments')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	async getAllPayments() {
		const { data, error } = await this.supabase
			.from('payments')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	// ============== USAGE LOGS ==============

	async logUsage(keyId, dataUsed) {
		const { error } = await this.supabase
			.from('usage_logs')
			.insert([{
				key_id: keyId,
				data_used: dataUsed
			}]);

		if (error) throw error;
	}

	async getUsageLogs(keyId) {
		const { data, error } = await this.supabase
			.from('usage_logs')
			.select('*')
			.eq('key_id', keyId)
			.order('logged_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	// ============== NOTIFICATIONS ==============

	async createNotification(keyId, notificationType, thresholdValue) {
		const { error } = await this.supabase
			.from('notifications')
			.insert([{
				key_id: keyId,
				notification_type: notificationType,
				threshold_value: thresholdValue
			}]);

		if (error) throw error;
	}

	async getNotifications(keyId) {
		const { data, error } = await this.supabase
			.from('notifications')
			.select('*')
			.eq('key_id', keyId)
			.order('sent_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	async checkNotificationSent(keyId, notificationType, thresholdValue) {
		const { data, error } = await this.supabase
			.from('notifications')
			.select('id')
			.eq('key_id', keyId)
			.eq('notification_type', notificationType)
			.eq('threshold_value', thresholdValue)
			.limit(1);

		if (error) throw error;
		return data && data.length > 0;
	}

	// ============== STATISTICS ==============

	async getStats() {
		// Получаем статистику параллельно
		const [usersResult, keysResult, paymentsResult, revenueResult] = await Promise.all([
			this.supabase.from('users').select('count', { count: 'exact', head: true }),
			this.supabase
				.from('keys')
				.select('count', { count: 'exact', head: true })
				.eq('status', 'active')
				.gt('expires_at', new Date().toISOString()),
			this.supabase
				.from('payments')
				.select('count', { count: 'exact', head: true })
				.eq('status', 'completed'),
			this.supabase
				.from('payments')
				.select('amount')
				.eq('status', 'completed')
		]);

		// Проверяем ошибки
		if (usersResult.error) throw usersResult.error;
		if (keysResult.error) throw keysResult.error;
		if (paymentsResult.error) throw paymentsResult.error;
		if (revenueResult.error) throw revenueResult.error;

		// Считаем revenue
		const totalRevenue = (revenueResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

		return {
			total_users: usersResult.count || 0,
			active_keys: keysResult.count || 0,
			total_payments: paymentsResult.count || 0,
			total_revenue: totalRevenue
		};
	}

	// ============== ADMIN STATISTICS ==============

	/**
	 * Получить ключи, истекающие между двумя датами
	 * @param {Date} startDate
	 * @param {Date} endDate
	 * @returns {Promise<Array>}
	 */
	async getKeysExpiringBetween(startDate, endDate) {
		const { data, error } = await this.supabase
			.from('keys')
			.select('*, users!inner(telegram_id, username, first_name, last_name)')
			.gte('expires_at', startDate.toISOString())
			.lt('expires_at', endDate.toISOString())
			.eq('status', 'active')
			.order('expires_at', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Статистика по платежам за период
	 * @param {Date} startDate
	 * @param {Date} endDate
	 * @returns {Promise<Object>}
	 */
	async getPaymentStats(startDate, endDate) {
		const { data, error } = await this.supabase
			.from('payments')
			.select('status, amount')
			.gte('created_at', startDate.toISOString())
			.lte('created_at', endDate.toISOString());

		if (error) throw error;

		const stats = {
			total: data.length,
			completed: 0,
			pending: 0,
			pending_activation: 0,
			failed: 0,
			totalRevenue: 0
		};

		data.forEach(payment => {
			stats[payment.status] = (stats[payment.status] || 0) + 1;
			if (payment.status === 'completed') {
				stats.totalRevenue += payment.amount;
			}
		});

		return stats;
	}

	/**
	 * Статистика по ключам за период
	 * @param {Date} startDate
	 * @param {Date} endDate
	 * @returns {Promise<Object>}
	 */
	async getKeyStats(startDate, endDate) {
		// Ключи, созданные за период
		const { data: createdKeys, error: createdError } = await this.supabase
			.from('keys')
			.select('id')
			.gte('created_at', startDate.toISOString())
			.lte('created_at', endDate.toISOString());

		if (createdError) throw createdError;

		// Активные ключи на данный момент
		const { data: activeKeys, error: activeError } = await this.supabase
			.from('keys')
			.select('id')
			.eq('status', 'active');

		if (activeError) throw activeError;

		// Истекшие ключи за период
		const { data: expiredKeys, error: expiredError } = await this.supabase
			.from('keys')
			.select('id')
			.eq('status', 'expired')
			.gte('expires_at', startDate.toISOString())
			.lte('expires_at', endDate.toISOString());

		if (expiredError) throw expiredError;

		return {
			created: createdKeys.length,
			active: activeKeys.length,
			expired: expiredKeys.length
		};
	}

	/**
	 * Статистика по пользователям за период
	 * @param {Date} startDate
	 * @param {Date} endDate
	 * @returns {Promise<Object>}
	 */
	async getUserStats(startDate, endDate) {
		// Всего пользователей
		const { count: totalUsers, error: totalError } = await this.supabase
			.from('users')
			.select('*', { count: 'exact', head: true });

		if (totalError) throw totalError;

		// Новые пользователи за период
		const { count: newUsers, error: newError } = await this.supabase
			.from('users')
			.select('*', { count: 'exact', head: true })
			.gte('created_at', startDate.toISOString())
			.lte('created_at', endDate.toISOString());

		if (newError) throw newError;

		// Пользователи с активными ключами
		const { data: usersWithKeys, error: keysError } = await this.supabase
			.from('keys')
			.select('user_id')
			.eq('status', 'active');

		if (keysError) throw keysError;

		const uniqueUsersWithKeys = new Set(usersWithKeys.map(k => k.user_id)).size;

		return {
			total: totalUsers || 0,
			newThisWeek: newUsers || 0,
			withActiveKeys: uniqueUsersWithKeys
		};
	}

	/**
	 * Топ N популярных планов за период
	 * @param {Date} startDate
	 * @param {Date} endDate
	 * @param {number} limit
	 * @returns {Promise<Array>}
	 */
	async getTopPlans(startDate, endDate, limit = 5) {
		const { data, error } = await this.supabase
			.from('payments')
			.select('plan_id')
			.eq('status', 'completed')
			.gte('created_at', startDate.toISOString())
			.lte('created_at', endDate.toISOString());

		if (error) throw error;

		// Подсчитываем количество покупок каждого плана
		const planCounts = data.reduce((acc, payment) => {
			acc[payment.plan_id] = (acc[payment.plan_id] || 0) + 1;
			return acc;
		}, {});

		// Сортируем и берём топ N
		return Object.entries(planCounts)
			.map(([plan_id, count]) => ({ plan_id, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, limit);
	}

	// ============== CLEANUP ==============

	close() {
		// Supabase JS client не требует явного закрытия подключения
		console.log('✅ Supabase клиент остановлен');
	}
}

module.exports = SupabaseDatabase;
