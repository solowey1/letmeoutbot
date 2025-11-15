# Проблема с отображением подписок в "Мои ключи"

## Описание проблемы

При покупке ключа пользователь видит сообщение "У вас пока нет активных ключей", хотя платёж был успешно обработан и отображается в админке.

## Причина

Подписки создаются со статусом `'pending'` и переводятся в статус `'active'` только после успешной активации через Outline API. Если активация не происходит по какой-либо причине, подписка остаётся в статусе `'pending'`.

Метод `getActiveSubscriptions()` показывает только подписки со статусом `'active'`:

```javascript
// src/models/Database.js:167-168
SELECT * FROM subscriptions
WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now')
```

## Процесс создания подписки

1. **Создание подписки** ([SubscriptionService.js:21-26](src/services/SubscriptionService.js#L21-L26))
   - Статус по умолчанию: `'pending'` ([Database.js:46](src/models/Database.js#L46))

2. **Активация подписки** ([SubscriptionService.js:40-68](src/services/SubscriptionService.js#L40-L68))
   - Создаётся VPN ключ через Outline API
   - Статус меняется на `'active'` ([SubscriptionService.js:54](src/services/SubscriptionService.js#L54))

3. **Если активация не удалась**
   - Статус устанавливается в `'suspended'` ([SubscriptionService.js:65](src/services/SubscriptionService.js#L65))
   - Подписка НЕ отображается в "Мои ключи"

## Возможные причины сбоя активации

1. **Проблемы с Outline API**
   - Недоступен сервер Outline
   - Неверные настройки API (URL, сертификаты)
   - Превышен лимит ключей на сервере

2. **Ошибки в коде**
   - Исключения в `OutlineService.createSubscriptionKey()`
   - Проблемы с сетью

3. **Ограничения на сервере**
   - Недостаточно ресурсов
   - Файрволл блокирует соединение

## Диагностика

### 1. Проверьте логи бота на сервере

Ищите сообщения:
```
❌ Ошибка активации ключа: ...
❌ Stack trace: ...
```

### 2. Используйте админ-панель

В админ-панели добавлена новая кнопка **"⏳ Pending подписки"**, которая показывает все неактивированные подписки:

```
Админ-панель → ⏳ Pending подписки
```

Там вы увидите:
- ID подписки
- Пользователя
- План
- Дату создания
- Текущий статус

### 3. Проверьте базу данных (на сервере)

```sql
-- Посмотреть все подписки пользователя
SELECT * FROM subscriptions
WHERE user_id = (SELECT id FROM users WHERE telegram_id = <ВАШ_TELEGRAM_ID>);

-- Посмотреть все pending подписки
SELECT s.*, u.telegram_id, u.username
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'pending';
```

### 4. Проверьте настройки Outline

```bash
# Проверьте доступность Outline API
curl -k https://<OUTLINE_SERVER_URL>/access-keys

# Проверьте переменные окружения
echo $OUTLINE_API_URL
echo $OUTLINE_CERT_SHA256
```

## Решение

### Временное решение

Используйте админ-панель для просмотра pending подписок и вручную активируйте их, если это необходимо.

### Постоянное решение

1. **Исправьте настройки Outline API**
   - Убедитесь, что `OUTLINE_API_URL` корректен
   - Проверьте `OUTLINE_CERT_SHA256`

2. **Добавьте retry механизм**
   - При ошибке активации повторять попытку несколько раз
   - Использовать очередь для отложенной активации

3. **Улучшите обработку ошибок**
   - Логировать больше деталей об ошибках
   - Отправлять уведомления админу о неудачных активациях

4. **Добавьте мониторинг**
   - Отслеживать количество pending подписок
   - Алертить при превышении порога

## Внесённые изменения

### Новые методы в Database.js

- `getAllUserSubscriptions(userId)` - получить все подписки пользователя
- `getPendingSubscriptions()` - получить все pending подписки (лимит 20)
- `getUserById(userId)` - получить пользователя по внутреннему ID

### Новый обработчик в AdminCallbacks.js

- `handleAdminPendingSubscriptions(ctx)` - показать список pending подписок

### Обновления

- **constants.js**: добавлен `CALLBACK_ACTIONS.ADMIN_PENDING_SUBS`
- **keyboards.js**: добавлена кнопка "⏳ Pending подписки" в админ-панель
- **callbackHandler.js**: добавлена обработка нового callback

## Рекомендации

1. **Мониторьте pending подписки ежедневно**
2. **Настройте алерты** при появлении pending подписок
3. **Проверьте логи** на наличие ошибок активации
4. **Улучшите retry логику** для автоматической повторной активации

## Файлы для проверки

- [src/services/SubscriptionService.js](src/services/SubscriptionService.js) - логика создания и активации
- [src/bot/VPNBot.js:187-256](src/bot/VPNBot.js#L187-L256) - обработка успешного платежа
- [src/models/Database.js:38-52](src/models/Database.js#L38-L52) - схема таблицы subscriptions
- [src/services/OutlineService.js](src/services/OutlineService.js) - взаимодействие с Outline API
