-- Support bot tables migration
-- Run this in Supabase SQL Editor after init.sql

-- Support messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id SERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    user_first_name TEXT,
    user_username TEXT,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'user_question' CHECK (message_type IN ('user_question', 'admin_reply')),
    replied_by_admin_id BIGINT,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for support messages
CREATE INDEX IF NOT EXISTS idx_support_messages_user_telegram_id ON support_messages(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_replied_at ON support_messages(replied_at);

-- Admin reply state table (для отслеживания, кому админ сейчас отвечает)
CREATE TABLE IF NOT EXISTS admin_reply_state (
    admin_telegram_id BIGINT PRIMARY KEY,
    replying_to_user_id BIGINT NOT NULL,
    replying_to_message_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Success message
SELECT 'Support bot tables created successfully!' as message;
