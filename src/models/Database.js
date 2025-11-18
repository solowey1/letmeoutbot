const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
	constructor(dbPath = './database.db') {
		this.dbPath = path.resolve(dbPath);
		this.db = null;
		this.init();
	}

	init() {
		this.db = new sqlite3.Database(this.dbPath, (err) => {
			if (err) {
				console.error('Ошибка подключения к базе данных:', err);
			} else {
				console.log('Подключение к SQLite базе данных установлено');
				this.createTables();
			}
		});
	}

	createTables() {
		const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                role TEXT DEFAULT 'user',
                language TEXT DEFAULT 'ru',
                referrer_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_id) REFERENCES users (id)
            )
        `;

		const createKeysTable = `
            CREATE TABLE IF NOT EXISTS keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan_id TEXT NOT NULL,
                outline_key_id INTEGER,
                access_url TEXT,
                data_limit INTEGER NOT NULL,
                data_used INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;

		const createPaymentsTable = `
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                key_id INTEGER,
                plan_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'XTR',
                status TEXT DEFAULT 'pending',
                telegram_payment_charge_id TEXT,
                provider_payment_charge_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (key_id) REFERENCES keys (id)
            )
        `;

		const createUsageLogsTable = `
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_id INTEGER NOT NULL,
                data_used INTEGER NOT NULL,
                logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (key_id) REFERENCES keys (id)
            )
        `;

		const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                threshold_value REAL NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (key_id) REFERENCES keys (id)
            )
        `;

		const createReferralsTable = `
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referred_id INTEGER NOT NULL,
                bonus_earned INTEGER DEFAULT 0,
                bonus_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_id) REFERENCES users (id),
                FOREIGN KEY (referred_id) REFERENCES users (id),
                UNIQUE(referrer_id, referred_id)
            )
        `;

		this.db.run(createUsersTable);
		this.db.run(createKeysTable);
		this.db.run(createPaymentsTable);
		this.db.run(createUsageLogsTable);
		this.db.run(createNotificationsTable);
		this.db.run(createReferralsTable);
	}

	// Методы для работы с пользователями
	async createUser(telegramId, username, firstName, lastName = null) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name) 
                VALUES (?, ?, ?, ?)
            `;
			this.db.run(query, [telegramId, username, firstName, lastName], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID || this.changes);
				}
			});
		});
	}

	async getUser(telegramId) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM users WHERE telegram_id = ?';
			this.db.get(query, [telegramId], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row);
				}
			});
		});
	}

	async updateUser(telegramId, updates) {
		return new Promise((resolve, reject) => {
			const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
			const values = Object.values(updates);
			values.push(telegramId);
            
			const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?`;
			this.db.run(query, values, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		});
	}

	// Методы для работы с ключами
	async createKey(userId, planId, dataLimit, expiresAt) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT INTO keys (user_id, plan_id, data_limit, expires_at)
                VALUES (?, ?, ?, ?)
            `;
			this.db.run(query, [userId, planId, dataLimit, expiresAt], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	}

	async getActiveKeys(userId) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT * FROM keys
                WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now')
            `;
			this.db.all(query, [userId], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	async getAllUserKeys(userId) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT * FROM keys
                WHERE user_id = ?
                ORDER BY created_at DESC
            `;
			this.db.all(query, [userId], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	async getPendingKeys() {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT * FROM keys
                WHERE status = 'pending'
                ORDER BY created_at DESC
                LIMIT 20
            `;
			this.db.all(query, [], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	async getUserById(userId) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM users WHERE id = ?';
			this.db.get(query, [userId], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row);
				}
			});
		});
	}

	async updateKey(id, updates) {
		return new Promise((resolve, reject) => {
			const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
			const values = Object.values(updates);
			values.push(id);

			const query = `UPDATE keys SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
			this.db.run(query, values, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		});
	}

	async getKey(id) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM keys WHERE id = ?';
			this.db.get(query, [id], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row);
				}
			});
		});
	}

	// Методы для работы с платежами
	async createPayment(userId, planId, amount) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT INTO payments (user_id, plan_id, amount) 
                VALUES (?, ?, ?)
            `;
			this.db.run(query, [userId, planId, amount], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	}

	async updatePayment(id, updates) {
		return new Promise((resolve, reject) => {
			const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
			const values = Object.values(updates);
			values.push(id);
            
			const query = `UPDATE payments SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
			this.db.run(query, values, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		});
	}

	async getPayment(id) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM payments WHERE id = ?';
			this.db.get(query, [id], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row);
				}
			});
		});
	}

	// Методы для логирования использования
	async logUsage(keyId, dataUsed) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT INTO usage_logs (key_id, data_used)
                VALUES (?, ?)
            `;
			this.db.run(query, [keyId, dataUsed], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	}

	// Административные методы
	async getStats() {
		return new Promise((resolve, reject) => {
			const queries = [
				'SELECT COUNT(*) as total_users FROM users',
				'SELECT COUNT(*) as active_keys FROM keys WHERE status = "active"',
				'SELECT SUM(amount) as total_revenue FROM payments WHERE status = "completed"',
				'SELECT COUNT(*) as total_payments FROM payments WHERE status = "completed"'
			];

			Promise.all(queries.map(query =>
				new Promise((resolve, reject) => {
					this.db.get(query, (err, row) => {
						if (err) reject(err);
						else resolve(row);
					});
				})
			)).then(results => {
				resolve({
					totalUsers: results[0].total_users,
					activeKeys: results[1].active_keys,
					totalRevenue: results[2].total_revenue || 0,
					totalPayments: results[3].total_payments
				});
			}).catch(reject);
		});
	}

	async getAllUsers(limit = 50, offset = 0) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT u.*, COUNT(k.id) as key_count
                FROM users u
                LEFT JOIN keys k ON u.id = k.user_id
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
            `;
			this.db.all(query, [limit, offset], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	// Методы для работы с уведомлениями
	async createNotification(keyId, notificationType, thresholdValue) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT INTO notifications (key_id, notification_type, threshold_value)
                VALUES (?, ?, ?)
            `;
			this.db.run(query, [keyId, notificationType, thresholdValue], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	}

	async checkNotificationSent(keyId, notificationType, thresholdValue) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT COUNT(*) as count
                FROM notifications
                WHERE key_id = ? AND notification_type = ? AND threshold_value = ?
                AND sent_at > datetime('now', '-7 days')
            `;
			this.db.get(query, [keyId, notificationType, thresholdValue], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row.count > 0);
				}
			});
		});
	}

	async getAllActiveKeys() {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT k.*, u.telegram_id
                FROM keys k
                JOIN users u ON k.user_id = u.id
                WHERE k.status = 'active'
                AND k.expires_at > datetime('now')
                ORDER BY k.created_at DESC
            `;
			this.db.all(query, [], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	// Методы для работы с рефералами
	async createReferral(referrerId, referredId) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT OR IGNORE INTO referrals (referrer_id, referred_id)
                VALUES (?, ?)
            `;
			this.db.run(query, [referrerId, referredId], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID || this.changes);
				}
			});
		});
	}

	async getReferralStats(userId) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT
                    COUNT(*) as total_referrals,
                    SUM(bonus_earned) as total_bonus
                FROM referrals
                WHERE referrer_id = ?
            `;
			this.db.get(query, [userId], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row);
				}
			});
		});
	}

	async getReferrals(userId, limit = 50) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT r.*, u.username, u.first_name, u.created_at as referred_date
                FROM referrals r
                JOIN users u ON r.referred_id = u.id
                WHERE r.referrer_id = ?
                ORDER BY r.created_at DESC
                LIMIT ?
            `;
			this.db.all(query, [userId, limit], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	async updateReferralBonus(referrerId, referredId, bonusAmount, bonusType) {
		return new Promise((resolve, reject) => {
			const query = `
                UPDATE referrals
                SET bonus_earned = bonus_earned + ?, bonus_type = ?
                WHERE referrer_id = ? AND referred_id = ?
            `;
			this.db.run(query, [bonusAmount, bonusType, referrerId, referredId], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		});
	}

	async setUserReferrer(userId, referrerId) {
		return new Promise((resolve, reject) => {
			const query = `
                UPDATE users
                SET referrer_id = ?
                WHERE id = ? AND referrer_id IS NULL
            `;
			this.db.run(query, [referrerId, userId], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		});
	}

	close() {
		if (this.db) {
			this.db.close((err) => {
				if (err) {
					console.error('Ошибка при закрытии базы данных:', err);
				} else {
					console.log('Соединение с базой данных закрыто');
				}
			});
		}
	}
}

module.exports = Database;