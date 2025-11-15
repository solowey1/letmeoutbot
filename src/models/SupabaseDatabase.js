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

	// ============== SUBSCRIPTIONS ==============

	async createSubscription(userId, planId, dataLimit, expiresAt) {
		const { data, error } = await this.supabase
			.from('subscriptions')
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

	async getSubscription(subscriptionId) {
		const { data, error } = await this.supabase
			.from('subscriptions')
			.select('*')
			.eq('id', subscriptionId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}

		return data;
	}

	async updateSubscription(subscriptionId, updates) {
		const { error } = await this.supabase
			.from('subscriptions')
			.update(updates)
			.eq('id', subscriptionId);

		if (error) throw error;
	}

	async getActiveSubscriptions(userId) {
		const { data, error } = await this.supabase
			.from('subscriptions')
			.select('*')
			.eq('user_id', userId)
			.eq('status', 'active')
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	async getAllUserSubscriptions(userId) {
		const { data, error } = await this.supabase
			.from('subscriptions')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	async getPendingSubscriptions(limit = 20) {
		const { data, error } = await this.supabase
			.from('subscriptions')
			.select('*')
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data || [];
	}

	async getAllActiveSubscriptions() {
		const { data, error } = await this.supabase
			.from('subscriptions')
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

	async createUsageLog(subscriptionId, dataUsed) {
		const { error } = await this.supabase
			.from('usage_logs')
			.insert([{
				subscription_id: subscriptionId,
				data_used: dataUsed
			}]);

		if (error) throw error;
	}

	async getUsageLogs(subscriptionId) {
		const { data, error } = await this.supabase
			.from('usage_logs')
			.select('*')
			.eq('subscription_id', subscriptionId)
			.order('logged_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	// ============== NOTIFICATIONS ==============

	async createNotification(subscriptionId, notificationType, thresholdValue) {
		const { error } = await this.supabase
			.from('notifications')
			.insert([{
				subscription_id: subscriptionId,
				notification_type: notificationType,
				threshold_value: thresholdValue
			}]);

		if (error) throw error;
	}

	async getNotifications(subscriptionId) {
		const { data, error } = await this.supabase
			.from('notifications')
			.select('*')
			.eq('subscription_id', subscriptionId)
			.order('sent_at', { ascending: false });

		if (error) throw error;
		return data || [];
	}

	async hasNotificationBeenSent(subscriptionId, notificationType, thresholdValue) {
		const { data, error } = await this.supabase
			.from('notifications')
			.select('id')
			.eq('subscription_id', subscriptionId)
			.eq('notification_type', notificationType)
			.eq('threshold_value', thresholdValue)
			.limit(1);

		if (error) throw error;
		return data && data.length > 0;
	}

	// ============== STATISTICS ==============

	async getStats() {
		// Получаем статистику параллельно
		const [usersResult, subsResult, paymentsResult, revenueResult] = await Promise.all([
			this.supabase.from('users').select('count', { count: 'exact', head: true }),
			this.supabase
				.from('subscriptions')
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
		if (subsResult.error) throw subsResult.error;
		if (paymentsResult.error) throw paymentsResult.error;
		if (revenueResult.error) throw revenueResult.error;

		// Считаем revenue
		const totalRevenue = (revenueResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

		return {
			total_users: usersResult.count || 0,
			active_subscriptions: subsResult.count || 0,
			total_payments: paymentsResult.count || 0,
			total_revenue: totalRevenue
		};
	}

	// ============== CLEANUP ==============

	close() {
		// Supabase JS client не требует явного закрытия подключения
		console.log('✅ Supabase клиент остановлен');
	}
}

module.exports = SupabaseDatabase;
