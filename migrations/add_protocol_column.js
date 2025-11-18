const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('./database.db');

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error('Ошибка подключения к базе данных:', err);
		process.exit(1);
	}
});

// Добавляем поле protocol в таблицу keys
const addProtocolColumn = `
    ALTER TABLE keys ADD COLUMN protocol TEXT DEFAULT 'tcp';
`;

db.run(addProtocolColumn, (err) => {
	if (err) {
		// Если колонка уже существует, игнорируем ошибку
		if (err.message.includes('duplicate column name')) {
			console.log('✅ Колонка protocol уже существует');
		} else {
			console.error('❌ Ошибка при добавлении колонки protocol:', err.message);
			process.exit(1);
		}
	} else {
		console.log('✅ Колонка protocol успешно добавлена в таблицу keys');
	}

	db.close((err) => {
		if (err) {
			console.error('Ошибка при закрытии базы данных:', err);
		}
		process.exit(0);
	});
});
