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
            SELECT u.*, COUNT(k.id) as key_count
            FROM users u
            LEFT JOIN keys k ON u.id = k.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT $1
        `;
		const result = await this.pool.query(query, [limit]);
		return result.rows;
	}

	// === KEYS ===
	async createKey(userId, planId, dataLimit, expiresAt) {
		const query = `
            INSERT INTO keys (user_id, plan_id, data_limit, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
		const result = await this.pool.query(query, [userId, planId, dataLimit, expiresAt]);
		return result.rows[0].id;
	}

	async getActiveKeys(userId) {
		const query = `
            SELECT * FROM keys
            WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
            ORDER BY created_at DESC
        `;
		const result = await this.pool.query(query, [userId]);
		return result.rows;
	}

	async getAllActiveKeys() {
		const query = `
            SELECT k.*, u.telegram_id
            FROM keys k
            JOIN users u ON k.user_id = u.id
            WHERE k.status = 'active' AND k.expires_at > NOW()
            ORDER BY k.created_at DESC
        `;
		const result = await this.pool.query(query);
		return result.rows;
	}

	async getAllUserKeys(userId) {
		const query = `
            SELECT * FROM keys
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
		const result = await this.pool.query(query, [userId]);
		return result.rows;
	}

	async getPendingKeys() {
		const query = `
            SELECT * FROM keys
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 20
        `;
		const result = await this.pool.query(query);
		return result.rows;
	}

	async getKey(id) {
		const query = 'SELECT * FROM keys WHERE id = $1';
		const result = await this.pool.query(query, [id]);
		return result.rows[0];
	}

	async updateKey(id, updates) {
		const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
		const values = Object.values(updates);
		const query = `UPDATE keys SET ${fields} WHERE id = $1`;
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
	async logUsage(keyId, dataUsed) {
		const query = `
            INSERT INTO usage_logs (key_id, data_used)
            VALUES ($1, $2)
        `;
		await this.pool.query(query, [keyId, dataUsed]);
	}

	// === NOTIFICATIONS ===
	async createNotification(keyId, notificationType, thresholdValue) {
		const query = `
            INSERT INTO notifications (key_id, notification_type, threshold_value)
            VALUES ($1, $2, $3)
            RETURNING id
        `;
		const result = await this.pool.query(query, [keyId, notificationType, thresholdValue]);
		return result.rows[0].id;
	}

	async checkNotificationSent(keyId, notificationType, thresholdValue) {
		const query = `
            SELECT COUNT(*) as count FROM notifications
            WHERE key_id = $1
            AND notification_type = $2
            AND threshold_value = $3
            AND sent_at > NOW() - INTERVAL '7 days'
        `;
		const result = await this.pool.query(query, [keyId, notificationType, thresholdValue]);
		return result.rows[0].count > 0;
	}

	// === STATS ===
	async getStats() {
		const queries = {
			totalUsers: 'SELECT COUNT(*) as count FROM users',
			activeKeys: 'SELECT COUNT(*) as count FROM keys WHERE status = \'active\' AND expires_at > NOW()',
			totalRevenue: 'SELECT COALESCE(SUM(amount), 0) as sum FROM payments WHERE status = \'completed\'',
			totalPayments: 'SELECT COUNT(*) as count FROM payments WHERE status = \'completed\''
		};

		const results = await Promise.all([
			this.pool.query(queries.totalUsers),
			this.pool.query(queries.activeKeys),
			this.pool.query(queries.totalRevenue),
			this.pool.query(queries.totalPayments)
		]);

		return {
			totalUsers: parseInt(results[0].rows[0].count),
			activeKeys: parseInt(results[1].rows[0].count),
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
