-- =============================================
-- VPN Bot Database Schema
-- =============================================
-- This file contains the initial database schema
-- for PostgreSQL and Supabase installations
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on telegram_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Keys table (previously subscriptions)
CREATE TABLE IF NOT EXISTS keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50),
    outline_key_id INTEGER,
    access_url TEXT,
    data_limit BIGINT,  -- in bytes
    data_used BIGINT DEFAULT 0,  -- in bytes
    expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, expired, suspended
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for keys table
CREATE INDEX IF NOT EXISTS idx_keys_user_id ON keys(user_id);
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_expires_at ON keys(expires_at);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50),
    amount INTEGER NOT NULL,  -- в Telegram Stars
    currency VARCHAR(10) DEFAULT 'XTR',  -- Telegram Stars
    telegram_payment_charge_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, completed, failed, refunded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_telegram_payment_charge_id ON payments(telegram_payment_charge_id);

-- Usage logs table (для отслеживания использования трафика)
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    key_id INTEGER NOT NULL REFERENCES keys(id) ON DELETE CASCADE,
    data_used BIGINT NOT NULL,  -- bytes used at this checkpoint
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for usage logs
CREATE INDEX IF NOT EXISTS idx_usage_logs_key_id ON usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_logged_at ON usage_logs(logged_at);

-- Notifications table (для отслеживания отправленных уведомлений)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    key_id INTEGER NOT NULL REFERENCES keys(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,  -- expiry_warning, limit_warning, etc.
    threshold_value INTEGER,  -- например, 80 для 80% лимита
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_key_id ON notifications(key_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_keys_updated_at ON keys;
CREATE TRIGGER update_keys_updated_at BEFORE UPDATE ON keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================
-- Uncomment to insert sample data for testing

-- INSERT INTO users (telegram_id, username, first_name, language_code) 
-- VALUES (123456789, 'testuser', 'Test User', 'en');
