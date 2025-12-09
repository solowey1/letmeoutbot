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
            SELECT
                u.*,
                COUNT(k.id) as key_count,
                COUNT(k.id) as keys_purchased,
                COUNT(CASE WHEN k.outline_key_id IS NOT NULL THEN 1 END) as keys_activated,
                COUNT(CASE WHEN k.status = 'active' THEN 1 END) as keys_active
            FROM users u
            LEFT JOIN keys k ON u.id = k.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT $1
        `;
		const result = await this.pool.query(query, [limit]);
		return result.rows.map(row => ({
			...row,
			keys_purchased: parseInt(row.keys_purchased) || 0,
			keys_activated: parseInt(row.keys_activated) || 0,
			keys_active: parseInt(row.keys_active) || 0
		}));
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

	// === REFERRALS ===
	async createReferral(referrerId, referredId) {
		const query = `
            INSERT INTO referrals (referrer_id, referred_id)
            VALUES ($1, $2)
            ON CONFLICT (referrer_id, referred_id) DO NOTHING
            RETURNING id
        `;
		const result = await this.pool.query(query, [referrerId, referredId]);
		return result.rows[0]?.id || 0;
	}

	async getReferralStats(userId) {
		const query = `
            SELECT
                COUNT(*) as total_referrals,
                COALESCE(SUM(bonus_earned), 0) as total_bonus
            FROM referrals
            WHERE referrer_id = $1
        `;
		const result = await this.pool.query(query, [userId]);
		return result.rows[0];
	}

	async getReferrals(userId, limit = 50) {
		const query = `
            SELECT r.*, u.username, u.first_name, u.created_at as referred_date
            FROM referrals r
            JOIN users u ON r.referred_id = u.id
            WHERE r.referrer_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2
        `;
		const result = await this.pool.query(query, [userId, limit]);
		return result.rows;
	}

	async updateReferralBonus(referrerId, referredId, bonusAmount, bonusType) {
		const query = `
            UPDATE referrals
            SET bonus_earned = bonus_earned + $1, bonus_type = $2
            WHERE referrer_id = $3 AND referred_id = $4
        `;
		await this.pool.query(query, [bonusAmount, bonusType, referrerId, referredId]);
	}

	async setUserReferrer(userId, referrerId) {
		const query = `
            UPDATE users
            SET referrer_id = $1
            WHERE id = $2 AND referrer_id IS NULL
        `;
		const result = await this.pool.query(query, [referrerId, userId]);
		return result.rowCount;
	}

	// === WITHDRAWALS ===
	async createWithdrawal(userId, amount) {
		const query = `
            INSERT INTO withdrawals (user_id, amount)
            VALUES ($1, $2)
            RETURNING id
        `;
		const result = await this.pool.query(query, [userId, amount]);
		return result.rows[0].id;
	}

	async getWithdrawal(withdrawalId) {
		const query = 'SELECT * FROM withdrawals WHERE id = $1';
		const result = await this.pool.query(query, [withdrawalId]);
		return result.rows[0];
	}

	async getUserWithdrawals(userId) {
		const query = `
            SELECT * FROM withdrawals
            WHERE user_id = $1
            ORDER BY requested_at DESC
        `;
		const result = await this.pool.query(query, [userId]);
		return result.rows;
	}

	async getPendingWithdrawals() {
		const query = `
            SELECT w.*, u.telegram_id, u.username, u.first_name
            FROM withdrawals w
            JOIN users u ON w.user_id = u.id
            WHERE w.status = 'pending'
            ORDER BY w.requested_at ASC
        `;
		const result = await this.pool.query(query);
		return result.rows;
	}

	async updateWithdrawalStatus(withdrawalId, status, processedBy = null, notes = null) {
		const query = `
            UPDATE withdrawals
            SET status = $1, processed_at = NOW(), processed_by = $2, notes = $3
            WHERE id = $4
        `;
		await this.pool.query(query, [status, processedBy, notes, withdrawalId]);
	}

	async getTotalWithdrawn(userId) {
		const query = `
            SELECT COALESCE(SUM(amount), 0) as total
            FROM withdrawals
            WHERE user_id = $1 AND status = 'completed'
        `;
		const result = await this.pool.query(query, [userId]);
		return parseInt(result.rows[0].total);
	}

	// Закрытие подключения
	async close() {
		await this.pool.end();
		console.log('PostgreSQL подключение закрыто');
	}
}

module.exports = PostgresDatabase;
