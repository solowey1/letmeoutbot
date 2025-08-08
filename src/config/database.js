require('dotenv').config();

const config = {
  database: {
    path: process.env.DATABASE_PATH || './database.db',
    options: {
      verbose: console.log
    }
  },
  
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    options: {
      handlerTimeout: 90000 // 90 секунд
    }
  },
  
  outline: {
    apiUrl: process.env.OUTLINE_API_URL,
    timeout: 10000 // 10 секунд
  },
  
  app: {
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;