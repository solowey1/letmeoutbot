#!/usr/bin/env node

/**
 * Одноразовый скрипт: подарить всем пользователям VLESS-ключ (10GB, 7 дней)
 * и отправить уведомление на их языке.
 *
 * Запуск: node scripts/gift-vless.js [--dry-run]
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const XRayService = require('../src/services/XRayService');
const config = require('../src/config');

// --- Настройки подарка ---
const GIFT_DATA_LIMIT_GB = 10;
const GIFT_DURATION_DAYS = 7;
const GIFT_PLAN_ID = 'gift_vless_10gb';

const MESSAGES = {
	ru: `🎉 <b>Обновление сервиса!</b>

Мы обновили наш сервис и добавили новый протокол <b>VLESS</b>, а также улучшили визуальную часть.

В честь этого события хотим подарить вам бесплатный ключ с лимитом в <b>10 ГБ</b> и <b>7 дней</b>, чтобы вы могли протестировать его.

Спасибо, что вы с нами! ❤️`,

	en: `🎉 <b>Service Update!</b>

We've updated our service and added a new <b>VLESS</b> protocol, as well as improved the visual design.

To celebrate, we'd like to give you a free key with a <b>10 GB</b> limit and <b>7 days</b> so you can test it out.

Thank you for being with us! ❤️`
};

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
	console.log(DRY_RUN ? '🧪 DRY RUN — ничего не будет создано/отправлено\n' : '🚀 Запуск раздачи подарков\n');

	// Инициализация
	const supabase = createClient(config.database.supabase.url, config.database.supabase.apiKey);
	const bot = new Telegraf(config.telegram.token);
	const xray = new XRayService(
		config.xray.panelUrl,
		config.xray.username,
		config.xray.password,
		config.xray.twoFactorSecret
	);

	// Получаем всех пользователей
	const { data: users, error } = await supabase
		.from('users')
		.select('id, telegram_id, first_name, language')
		.order('id');

	if (error) throw error;

	console.log(`📋 Найдено пользователей: ${users.length}\n`);

	const expiresAt = new Date(Date.now() + GIFT_DURATION_DAYS * 24 * 60 * 60 * 1000);
	const expiryTimeMs = expiresAt.getTime();
	const dataLimitBytes = GIFT_DATA_LIMIT_GB * 1024 * 1024 * 1024;

	let created = 0, sent = 0, errors = 0;

	for (const user of users) {
		const lang = user.language === 'ru' ? 'ru' : 'en';
		const label = `${user.first_name || 'User'} (${user.telegram_id})`;

		try {
			if (DRY_RUN) {
				console.log(`  [DRY] ${label} — lang=${lang}, would create key & send message`);
				created++;
				sent++;
				continue;
			}

			// 1. Создаём запись ключа в БД
			const { data: keyData, error: keyError } = await supabase
				.from('keys')
				.insert([{
					user_id: user.id,
					plan_id: GIFT_PLAN_ID,
					data_limit: dataLimitBytes,
					expires_at: expiresAt.toISOString(),
					status: 'pending'
				}])
				.select('id')
				.single();

			if (keyError) throw keyError;

			const keyId = keyData.id;
			const xrayEmail = `lmo_${user.telegram_id}_${keyId}`;

			// 2. Создаём VLESS Reality ключ на сервере
			const vlessKey = await xray.createRealityClient(xrayEmail, GIFT_DATA_LIMIT_GB, expiryTimeMs);

			// 3. Обновляем запись ключа
			const { error: updateError } = await supabase
				.from('keys')
				.update({
					key_type: 'vless_reality',
					xray_email: xrayEmail,
					vless_reality_uuid: vlessKey.uuid,
					vless_reality_url: vlessKey.accessUrl,
					vless_reality_sub_id: vlessKey.subId,
					status: 'active'
				})
				.eq('id', keyId);

			if (updateError) throw updateError;

			created++;
			console.log(`  ✅ ${label} — ключ #${keyId} создан`);

			// 4. Отправляем сообщение
			try {
				await bot.telegram.sendMessage(user.telegram_id, MESSAGES[lang], {
					parse_mode: 'HTML'
				});
				sent++;
				console.log(`  📨 ${label} — сообщение отправлено`);
			} catch (msgErr) {
				console.error(`  ⚠️  ${label} — сообщение не отправлено: ${msgErr.message}`);
			}

			// Задержка между пользователями (Telegram rate limit)
			await sleep(100);

		} catch (err) {
			errors++;
			console.error(`  ❌ ${label} — ошибка: ${err.message}`);
		}
	}

	console.log(`\n📊 Итого: создано ${created}, отправлено ${sent}, ошибок ${errors}`);
	process.exit(0);
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
	console.error('💥 Критическая ошибка:', err);
	process.exit(1);
});
