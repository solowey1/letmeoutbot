# 🌐 Руководство по интеграции i18n

## ✅ Что уже сделано

### 1. Установлены зависимости
- Установлена библиотека `i18n` через npm

### 2. Созданы файлы переводов
- ✅ [src/locales/ru.json](src/locales/ru.json) - Русские переводы
- ✅ [src/locales/en.json](src/locales/en.json) - Английские переводы

### 3. Создан сервис локализации
- ✅ [src/services/I18nService.js](src/services/I18nService.js)
  - Автоопределение языка из Telegram
  - Поддержка параметров в переводах ({{param}})
  - Навигация по вложенным ключам

### 4. Создан middleware
- ✅ [src/middleware/i18nMiddleware.js](src/middleware/i18nMiddleware.js)
  - Автоматическое определение языка при первом запуске
  - Сохранение языка в БД
  - Добавление `ctx.i18n.t()` в контекст

### 5. Обновлена БД
- ✅ Добавлено поле `language` в таблицу `users`
- ✅ Миграция автоматическая при пересоздании БД

## 📋 Инструкция по интеграции

### Шаг 1: Интеграция в VPNBot

Откройте [src/bot/VPNBot.js](src/bot/VPNBot.js) и добавьте:

```javascript
// Добавьте импорты в начало файла
const I18nService = require('../services/I18nService');
const I18nMiddleware = require('../middleware/i18nMiddleware');

class VPNBot {
    constructor() {
        this.bot = new Telegraf(config.telegram.token, config.telegram.options);

        // Инициализируйте сервисы
        this.db = new Database(config.database.path);
        this.i18nService = new I18nService(); // <-- ДОБАВИТЬ

        // Создайте middleware
        const i18nMiddleware = new I18nMiddleware(this.i18nService, this.db); // <-- ДОБАВИТЬ

        // Подключите middleware ПЕРЕД setupHandlers()
        this.bot.use(i18nMiddleware.middleware()); // <-- ДОБАВИТЬ

        // ... остальной код
        this.setupHandlers();
    }
}
```

### Шаг 2: Использование переводов в обработчиках

#### Пример: Команда /start

**Было:**
```javascript
this.bot.start(async (ctx) => {
    await ctx.reply(MESSAGES.WELCOME, {
        ...KeyboardUtils.createMainMenu(),
        parse_mode: 'HTML'
    });
});
```

**Стало:**
```javascript
this.bot.start(async (ctx) => {
    const t = ctx.i18n.t; // Функция перевода

    let message = `🔐 <b>${t('welcome.title')}</b>\n\n`;
    message += `${t('welcome.description')}\n\n`;
    message += `💰 ${t('welcome.payment')}\n`;
    message += `🚀 ${t('welcome.instant')}\n`;
    message += `🔒 ${t('welcome.security')}\n\n`;
    message += `${t('welcome.choose_plan')}`;

    await ctx.reply(message, {
        ...KeyboardUtils.createMainMenu(),
        parse_mode: 'HTML'
    });
});
```

### Шаг 3: Обновление клавиатур

Откройте [src/utils/keyboards.js](src/utils/keyboards.js):

```javascript
class KeyboardUtils {
    static createMainMenu(t) { // <-- Принимаем функцию перевода
        return Markup.inlineKeyboard([
            [Markup.button.callback(t('buttons.buy_vpn'), CALLBACK_ACTIONS.BUY_PLAN)],
            [Markup.button.callback(t('buttons.my_keys'), CALLBACK_ACTIONS.MY_KEYS)],
            [Markup.button.callback(t('buttons.settings'), 'settings')], // <-- НОВОЕ
            [Markup.button.callback(t('buttons.help'), 'help')],
        ]);
    }
}
```

И вызывайте так:
```javascript
KeyboardUtils.createMainMenu(ctx.i18n.t)
```

### Шаг 4: Добавление меню настроек языка

Добавьте в [src/config/constants.js](src/config/constants.js):

```javascript
const CALLBACK_ACTIONS = {
  // ... существующие
  SETTINGS: 'settings',
  CHANGE_LANGUAGE: 'change_lang',
  SET_LANGUAGE: 'set_lang', // set_lang_ru, set_lang_en
};
```

Добавьте в [src/handlers/callbackHandler.js](src/handlers/callbackHandler.js):

```javascript
async handleCallback(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const t = ctx.i18n.t; // <-- Добавить

    try {
        await ctx.answerCbQuery();

        if (callbackData === 'settings') {
            await this.handleSettings(ctx);
        } else if (callbackData === 'change_lang') {
            await this.handleChangeLanguage(ctx);
        } else if (callbackData.startsWith('set_lang_')) {
            const lang = callbackData.split('_')[2]; // ru или en
            await this.handleSetLanguage(ctx, lang);
        }
        // ... остальные обработчики
    }
}

async handleSettings(ctx) {
    const t = ctx.i18n.t;
    const message = t('settings.title');

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(t('buttons.language'), 'change_lang')],
        [Markup.button.callback(t('buttons.back_to_menu'), CALLBACK_ACTIONS.BACK_TO_MENU)]
    ]);

    await ctx.editMessageText(message, {
        ...keyboard,
        parse_mode: 'HTML'
    });
}

async handleChangeLanguage(ctx) {
    const t = ctx.i18n.t;
    const message = t('settings.language_title');

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🇷🇺 Русский', 'set_lang_ru')],
        [Markup.button.callback('🇬🇧 English', 'set_lang_en')],
        [Markup.button.callback(t('buttons.back'), 'settings')]
    ]);

    await ctx.editMessageText(message, {
        ...keyboard,
        parse_mode: 'HTML'
    });
}

async handleSetLanguage(ctx, lang) {
    await ctx.i18n.setLocale(lang);
    const t = ctx.i18n.t; // Обновляем функцию перевода

    await ctx.editMessageText(t('settings.language_changed'), {
        ...KeyboardUtils.createMainMenu(t),
        parse_mode: 'HTML'
    });
}
```

## 🎯 Примеры использования переводов

### Простой перевод
```javascript
const t = ctx.i18n.t;
const title = t('welcome.title'); // "Let me Out VPN приветствует вас!"
```

### С параметрами
```javascript
const message = t('notifications.traffic_warning_5.message', {
    percentage: 5,
    days: 3
});
// "Осталось всего 5% от трафика.\nДней до окончания: 3..."
```

### Массивы (автосоединение)
```javascript
const steps = t('help.steps');
// "Выберите тарифный план\nОплатите через Telegram Stars..."
```

## 🔄 Миграция существующего кода

### 1. Найдите все хардкод-строки
```bash
grep -r "Купить VPN" src/
grep -r "Мои ключи" src/
```

### 2. Замените на ключи переводов
**Было:** `"💎 Купить VPN"`
**Стало:** `t('buttons.buy_vpn')`

### 3. Передавайте `t` функцию везде
```javascript
// В обработчиках
const t = ctx.i18n.t;

// В сервисах - передавайте как параметр
await this.notificationService.sendNotification(userId, notification, t);
```

## 📝 Добавление новых переводов

1. Откройте [src/locales/ru.json](src/locales/ru.json)
2. Добавьте новый ключ:
```json
{
  "new_feature": {
    "title": "Новая фича",
    "description": "Описание новой фичи"
  }
}
```

3. Добавьте тот же ключ в [src/locales/en.json](src/locales/en.json):
```json
{
  "new_feature": {
    "title": "New Feature",
    "description": "New feature description"
  }
}
```

4. Используйте:
```javascript
t('new_feature.title') // "Новая фича" или "New Feature"
```

## 🚨 Важные замечания

1. **БД требует пересоздания** для добавления поля `language`:
   ```bash
   rm database.db
   npm start
   ```

2. **Все функции клавиатур** должны принимать `t` как параметр

3. **Сервисы** (PaymentService, NotificationService) должны получать `t` извне

4. **Определение языка** происходит автоматически при первом `/start`

5. **Язык по умолчанию**: английский для международной аудитории

## ✨ Преимущества реализации

✅ **Автоопределение языка** из Telegram профиля
✅ **Сохранение предпочтений** в БД
✅ **Переключение на лету** через меню настроек
✅ **Поддержка параметров** в переводах
✅ **Централизованное хранение** всех текстов
✅ **Легко добавлять новые языки**

## 🎉 Следующие шаги

1. Интегрируйте middleware в VPNBot
2. Обновите 2-3 основных обработчика для проверки
3. Добавьте меню настроек
4. Постепенно мигрируйте остальные обработчики
5. Тестируйте оба языка

---

**Готово!** Теперь ваш бот поддерживает многоязычность! 🌍
