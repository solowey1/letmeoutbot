const { Pool } = require('pg');

class PostgresDatabase {
	constructor(connectionString) {
		this.pool = new Pool({
			connectionString,
			ssl: {
				rejectUnauthorized: false // Для Supabase
			},
			max: 20, // Максимум подключений в пуле
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});

		this.pool.on('error', (err) => {
			console.error('Неожиданная ошибка PostgreSQL pool:', err);
		});

		console.log('✅ PostgreSQL подключение инициализировано');
	}

	// Таблицы создаются через миграцию 001_initial_schema.sql в Supabase
	async createTables() {
		console.log('ℹ️  Таблицы должны быть созданы через Supabase SQL Editor (migrations/001_initial_schema.sql)');
		// Проверим подключение
		try {
			const result = await this.pool.query('SELECT NOW()');
			console.log('✅ Подключение к PostgreSQL установлено:', result.rows[0].now);
		} catch (error) {
			console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
			throw error;
		}
	}

	// === USERS ===
	async createUser(telegramId, username, firstName, lastName = null) {
		const query = `
            INSERT INTO users (telegram_id, username, first_name, last_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (telegram_id) DO NOTHING
            RETURNING id
        `;
		const result = await this.pool.query(query, [telegramId, username, firstName, lastName]);
		return result.rows[0]?.id || 0;
	}

	async getUser(telegramId) {
		const query = 'SELECT * FROM users WHERE telegram_id = $1';
		const result = await this.pool.query(query, [telegramId]);
		return result.rows[0];
	}

	async getUserById(userId) {
		const query = 'SELECT * FROM users WHERE id = $1';
		const result = await this.pool.query(query, [userId]);
		return result.rows[0];
	}

	async updateUser(telegramId, updates) {
		const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
		const values = Object.values(updates);
		const query = `UPDATE users SET ${fields} WHERE telegram_id = $1`;
		await this.pool.query(query, [telegramId, ...values]);
	}

	async getAllUsers(limit = 100) {
		const query = `
            SELECT u.*, COUNT(s.id) as subscription_count
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT $1
        `;
		const result = await this.pool.query(query, [limit]);
		return result.rows;
	}

	// === SUBSCRIPTIONS ===
	async createSubscription(userId, planId, dataLimit, expiresAt) {
		const query = `
            INSERT INTO subscriptions (user_id, plan_id, data_limit, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
		const result = await this.pool.query(query, [userId, planId, dataLimit, expiresAt]);
		return result.rows[0].id;
	}

	async getActiveSubscriptions(userId) {
		const query = `
            SELECT * FROM subscriptions
            WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
            ORDER BY created_at DESC
        `;
		const result = await this.pool.query(query, [userId]);
		return result.rows;
	}

	async getAllActiveSubscriptions() {
		const query = `
            SELECT s.*, u.telegram_id
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active' AND s.expires_at > NOW()
            ORDER BY s.created_at DESC
        `;
		const result = await this.pool.query(query);
		return result.rows;
	}

	async getAllUserSubscriptions(userId) {
		const query = `
            SELECT * FROM subscriptions
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
		const result = await this.pool.query(query, [userId]);
		return result.rows;
	}

	async getPendingSubscriptions() {
		const query = `
            SELECT * FROM subscriptions
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 20
        `;
		const result = await this.pool.query(query);
		return result.rows;
	}

	async getSubscriptionById(id) {
		const query = 'SELECT * FROM subscriptions WHERE id = $1';
		const result = await this.pool.query(query, [id]);
		return result.rows[0];
	}

	async updateSubscription(id, updates) {
		const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
		const values = Object.values(updates);
		const query = `UPDATE subscriptions SET ${fields} WHERE id = $1`;
		await this.pool.query(query, [id, ...values]);
	}

	// === PAYMENTS ===
	async createPayment(userId, planId, amount, currency = 'XTR') {
		const query = `
            INSERT INTO payments (user_id, plan_id, amount, currency)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
		const result = await this.pool.query(query, [userId, planId, amount, currency]);
		return result.rows[0].id;
	}

	async getPayment(id) {
		const query = 'SELECT * FROM payments WHERE id = $1';
		const result = await this.pool.query(query, [id]);
		return result.rows[0];
	}

	async updatePayment(id, updates) {
		const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
		const values = Object.values(updates);
		const query = `UPDATE payments SET ${fields} WHERE id = $1`;
		await this.pool.query(query, [id, ...values]);
	}

	// === USAGE LOGS ===
	async logUsage(subscriptionId, dataUsed) {
		const query = `
            INSERT INTO usage_logs (subscription_id, data_used)
            VALUES ($1, $2)
        `;
		await this.pool.query(query, [subscriptionId, dataUsed]);
	}

	// === NOTIFICATIONS ===
	async createNotification(subscriptionId, notificationType, thresholdValue) {
		const query = `
            INSERT INTO notifications (subscription_id, notification_type, threshold_value)
            VALUES ($1, $2, $3)
            RETURNING id
        `;
		const result = await this.pool.query(query, [subscriptionId, notificationType, thresholdValue]);
		return result.rows[0].id;
	}

	async checkNotificationSent(subscriptionId, notificationType, thresholdValue) {
		const query = `
            SELECT COUNT(*) as count FROM notifications
            WHERE subscription_id = $1
            AND notification_type = $2
            AND threshold_value = $3
            AND sent_at > NOW() - INTERVAL '7 days'
        `;
		const result = await this.pool.query(query, [subscriptionId, notificationType, thresholdValue]);
		return result.rows[0].count > 0;
	}

	// === STATS ===
	async getStats() {
		const queries = {
			totalUsers: 'SELECT COUNT(*) as count FROM users',
			activeSubscriptions: 'SELECT COUNT(*) as count FROM subscriptions WHERE status = \'active\' AND expires_at > NOW()',
			totalRevenue: 'SELECT COALESCE(SUM(amount), 0) as sum FROM payments WHERE status = \'completed\'',
			totalPayments: 'SELECT COUNT(*) as count FROM payments WHERE status = \'completed\''
		};

		const results = await Promise.all([
			this.pool.query(queries.totalUsers),
			this.pool.query(queries.activeSubscriptions),
			this.pool.query(queries.totalRevenue),
			this.pool.query(queries.totalPayments)
		]);

		return {
			totalUsers: parseInt(results[0].rows[0].count),
			activeSubscriptions: parseInt(results[1].rows[0].count),
			totalRevenue: parseInt(results[2].rows[0].sum),
			totalPayments: parseInt(results[3].rows[0].count)
		};
	}

	// Закрытие подключения
	async close() {
		await this.pool.end();
		console.log('PostgreSQL подключение закрыто');
	}
}

module.exports = PostgresDatabase;
