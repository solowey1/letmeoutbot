require('dotenv').config();
const SupabaseDatabase = require('./src/models/SupabaseDatabase');

async function testSupabase() {
	console.log('🧪 Тестирование Supabase подключения...\n');

	const supabaseUrl = process.env.SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_API_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.error('❌ SUPABASE_URL или SUPABASE_API_KEY не найдены в .env');
		console.log('\n💡 Добавьте в .env файл:');
		console.log('   SUPABASE_URL=https://your-project.supabase.co');
		console.log('   SUPABASE_API_KEY=your_anon_key');
		process.exit(1);
	}

	console.log('📝 Supabase URL:', supabaseUrl);
	console.log('📝 API Key:', supabaseKey.substring(0, 20) + '...\n');

	try {
		// Создаём экземпляр базы данных
		const db = new SupabaseDatabase(supabaseUrl, supabaseKey);

		// Тест 1: Инициализация и подключение
		console.log('1️⃣ Проверка подключения...');
		await db.init();

		// Тест 2: Проверка таблиц (попытка получить пользователей)
		console.log('\n2️⃣ Проверка таблицы users...');
		const users = await db.getAllUsers();
		console.log(`   ✅ Найдено пользователей: ${users.length}`);

		// Тест 3: Проверка таблицы subscriptions
		console.log('\n3️⃣ Проверка таблицы subscriptions...');
		const activeSubs = await db.getAllActiveSubscriptions();
		console.log(`   ✅ Активных подписок: ${activeSubs.length}`);

		const pendingSubs = await db.getPendingSubscriptions();
		console.log(`   ✅ Pending подписок: ${pendingSubs.length}`);

		// Тест 4: Статистика
		console.log('\n4️⃣ Получение статистики...');
		const stats = await db.getStats();
		console.log('   ✅ Статистика:');
		console.log(`      - Всего пользователей: ${stats.total_users}`);
		console.log(`      - Активных подписок: ${stats.active_subscriptions}`);
		console.log(`      - Завершённых платежей: ${stats.total_payments}`);
		console.log(`      - Общий доход: ${stats.total_revenue} XTR`);

		console.log('\n✅ Все тесты прошли успешно!');
		console.log('🚀 Supabase готов к использованию');

		db.close();
		process.exit(0);

	} catch (error) {
		console.error('\n❌ Ошибка при тестировании:', error.message);
		console.error('\n📋 Детали ошибки:', error);

		if (error.message.includes('relation') && error.message.includes('does not exist')) {
			console.log('\n💡 Таблицы не созданы. Выполните миграцию:');
			console.log('   1. Откройте Supabase Dashboard → SQL Editor');
			console.log('   2. Скопируйте migrations/001_initial_schema.sql');
			console.log('   3. Вставьте и выполните SQL');
		} else if (error.message.includes('Invalid API key')) {
			console.log('\n💡 Неверный API ключ. Проверьте SUPABASE_API_KEY в .env');
			console.log('   Получите ключ: Supabase Dashboard → Settings → API → anon public');
		}

		process.exit(1);
	}
}

testSupabase();
