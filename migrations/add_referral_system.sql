-- Referral system tables
-- Run this after init.sql migration

-- Add referrer_id to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for referrer lookups
CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_id);

-- Referrals table - tracks referral relationships and bonuses
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_earned INTEGER DEFAULT 0,
    bonus_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referrer_id, referred_id)
);

-- Create indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at);

-- Withdrawals table - tracks bonus withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by BIGINT,
    notes TEXT
);

-- Create indexes for withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at ON withdrawals(requested_at);

-- Success message
SELECT 'Referral system schema created successfully!' as message;
