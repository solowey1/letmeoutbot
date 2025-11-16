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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

		const createKeysTable = `
            CREATE TABLE IF NOT EXISTS access_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                outline_key_id INTEGER NOT NULL,
                access_url TEXT NOT NULL,
                name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;

		this.db.run(createUsersTable);
		this.db.run(createKeysTable);
	}

	addUser(telegramId, username, firstName) {
		return new Promise((resolve, reject) => {
			const query = 'INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)';
			this.db.run(query, [telegramId, username, firstName], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	}

	getUser(telegramId) {
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

	addAccessKey(userId, outlineKeyId, accessUrl, name) {
		return new Promise((resolve, reject) => {
			const query = 'INSERT INTO access_keys (user_id, outline_key_id, access_url, name) VALUES (?, ?, ?, ?)';
			this.db.run(query, [userId, outlineKeyId, accessUrl, name], function(err) {
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	}

	getUserKeys(userId) {
		return new Promise((resolve, reject) => {
			const query = 'SELECT * FROM access_keys WHERE user_id = ?';
			this.db.all(query, [userId], (err, rows) => {
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