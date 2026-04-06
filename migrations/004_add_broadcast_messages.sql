-- Broadcast messages table for scheduled and filtered broadcasts
-- Run this after init.sql migration

-- Broadcast messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id SERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    message_text TEXT NOT NULL,
    filter_type TEXT NOT NULL CHECK (filter_type IN ('all', 'active_keys', 'expired_keys', 'no_keys', 'paid_users', 'free_users', 'language', 'new_users', 'old_users')),
    filter_value TEXT, -- For language filter (ru/en), or date ranges
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE, -- NULL for immediate send
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for broadcast messages
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_scheduled_at ON broadcast_messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_admin_id ON broadcast_messages(admin_id);

-- Broadcast recipients tracking table (to avoid duplicate sends)
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id SERIAL PRIMARY KEY,
    broadcast_id INTEGER NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(broadcast_id, user_id)
);

-- Create indexes for broadcast recipients
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON broadcast_recipients(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user_id ON broadcast_recipients(user_id);

-- Add trigger for broadcast messages updated_at
CREATE TRIGGER update_broadcast_messages_updated_at BEFORE UPDATE ON broadcast_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Broadcast messages schema created successfully!' as message;
