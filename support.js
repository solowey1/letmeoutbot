#!/usr/bin/env node

/**
 * Support Bot Entry Point
 * Запуск бота поддержки отдельно от основного бота
 */

const SupportBot = require('./src/bot/support/SupportBot');

// Создаем и запускаем бота
const supportBot = new SupportBot();
supportBot.start();
