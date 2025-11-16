require('dotenv').config();

const config = {
	database: {
		type: process.env.DATABASE_TYPE || 'sqlite', // 'sqlite', 'postgres', or 'supabase'

		// SQLite configuration
		path: process.env.DATABASE_PATH || './database.db',
		options: {
			verbose: process.env.NODE_ENV === 'development' ? console.log : null
		},

		// Supabase configuration (recommended)
		supabase: {
			url: process.env.SUPABASE_URL,
			apiKey: process.env.SUPABASE_API_KEY
		},

		// PostgreSQL / Direct connection configuration
		url: process.env.DATABASE_URL, // Connection string
		postgres: {
			host: process.env.POSTGRES_HOST,
			port: parseInt(process.env.POSTGRES_PORT || '5432'),
			database: process.env.POSTGRES_DB || 'postgres',
			user: process.env.POSTGRES_USER,
			password: process.env.POSTGRES_PASSWORD
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