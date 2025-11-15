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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

		const createSubscriptionsTable = `
            CREATE TABLE IF NOT EXISTS subscriptions (
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
                subscription_id INTEGER,
                plan_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'XTR',
                status TEXT DEFAULT 'pending',
                telegram_payment_charge_id TEXT,
                provider_payment_charge_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
            )
        `;

		const createUsageLogsTable = `
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscription_id INTEGER NOT NULL,
                data_used INTEGER NOT NULL,
                logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
            )
        `;

		const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscription_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                threshold_value REAL NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subscription_id) REFERENCES subscriptions (id)
            )
        `;

		this.db.run(createUsersTable);
		this.db.run(createSubscriptionsTable);
		this.db.run(createPaymentsTable);
		this.db.run(createUsageLogsTable);
		this.db.run(createNotificationsTable);
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

	// Методы для работы с подписками
	async createSubscription(userId, planId, dataLimit, expiresAt) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT INTO subscriptions (user_id, plan_id, data_limit, expires_at) 
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

	async getActiveSubscriptions(userId) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT * FROM subscriptions
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

	async getAllUserSubscriptions(userId) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT * FROM subscriptions
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

	async getPendingSubscriptions() {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT * FROM subscriptions
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

	async updateSubscription(id, updates) {
		return new Promise((resolve, reject) => {
			const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
			const values = Object.values(updates);
			values.push(id);
            
			const query = `UPDATE subscriptions SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
			this.db.run(query, values, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		});
	}

	async getSubscriptionById(id) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM subscriptions WHERE id = ?';
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

	async getPaymentById(id) {
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
	async logUsage(subscriptionId, dataUsed) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT INTO usage_logs (subscription_id, data_used) 
                VALUES (?, ?)
            `;
			this.db.run(query, [subscriptionId, dataUsed], function(err) {
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
				'SELECT COUNT(*) as active_subscriptions FROM subscriptions WHERE status = "active"',
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
					activeSubscriptions: results[1].active_subscriptions,
					totalRevenue: results[2].total_revenue || 0,
					totalPayments: results[3].total_payments
				});
			}).catch(reject);
		});
	}

	async getAllUsers(limit = 50, offset = 0) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT u.*, COUNT(s.id) as subscription_count 
                FROM users u 
                LEFT JOIN subscriptions s ON u.id = s.user_id 
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
	async createNotification(subscriptionId, notificationType, thresholdValue) {
		return new Promise((resolve, reject) => {
			const query = `
                INSERT INTO notifications (subscription_id, notification_type, threshold_value)
                VALUES (?, ?, ?)
            `;
			this.db.run(query, [subscriptionId, notificationType, thresholdValue], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	}

	async checkNotificationSent(subscriptionId, notificationType, thresholdValue) {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT COUNT(*) as count 
                FROM notifications 
                WHERE subscription_id = ? AND notification_type = ? AND threshold_value = ?
                AND sent_at > datetime('now', '-7 days')
            `;
			this.db.get(query, [subscriptionId, notificationType, thresholdValue], (err, row) => {
				if (err) {
					reject(err);
				} else {
					resolve(row.count > 0);
				}
			});
		});
	}

	async getAllActiveSubscriptions() {
		return new Promise((resolve, reject) => {
			const query = `
                SELECT s.*, u.telegram_id 
                FROM subscriptions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.status = 'active' 
                AND s.expires_at > datetime('now')
                ORDER BY s.created_at DESC
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