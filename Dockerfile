# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Создаем пользователя для запуска приложения (безопасность)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vpnbot -u 1001

# Копируем исходный код
COPY src/ ./src/
COPY support.js ./
COPY .env.example ./

# Создаем директорию для базы данных
RUN mkdir -p /app/data && chown -R vpnbot:nodejs /app

# Переключаемся на пользователя vpnbot
USER vpnbot

# Указываем порт (хотя для бота не нужен)
EXPOSE 3000

# Команда для запуска
CMD ["node", "src/index.js"]