-- VPN Bot Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'user',
    language TEXT DEFAULT 'ru',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    outline_key_id INTEGER,
    access_url TEXT,
    data_limit BIGINT NOT NULL,
    data_used BIGINT DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    plan_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'XTR',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    telegram_payment_charge_id TEXT,
    provider_payment_charge_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_telegram_charge_id ON payments(telegram_payment_charge_id);

-- Usage logs table
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    data_used BIGINT NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for usage logs
CREATE INDEX IF NOT EXISTS idx_usage_logs_subscription_id ON usage_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_logged_at ON usage_logs(logged_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    threshold_value REAL NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_subscription_id ON notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for active subscriptions with user info (optional, for easier queries)
CREATE OR REPLACE VIEW active_subscriptions_view AS
SELECT
    s.id as subscription_id,
    s.plan_id,
    s.status,
    s.data_used,
    s.data_limit,
    s.expires_at,
    s.access_url,
    u.id as user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    u.language
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active' AND s.expires_at > NOW();

-- Grant permissions (Supabase handles this automatically, but good to be explicit)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Success message
SELECT 'VPN Bot schema created successfully!' as message;
