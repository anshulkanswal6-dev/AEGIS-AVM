-- Migration: Telegram Integration
-- Created: 2026-04-09

-- Table: user_telegram_accounts
CREATE TABLE IF NOT EXISTS user_telegram_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    telegram_user_id TEXT UNIQUE NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    telegram_username TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id) -- Ensure one user has only one Telegram account linked
);

CREATE INDEX IF NOT EXISTS idx_user_telegram_accounts_user_id ON user_telegram_accounts(user_id);

-- Table: telegram_link_tokens
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Optional but recommended for consistency with existing AEGIS schema)
ALTER TABLE user_telegram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own telegram account" ON user_telegram_accounts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own telegram account" ON user_telegram_accounts
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view their own link tokens" ON telegram_link_tokens
    FOR SELECT USING (user_id = auth.uid());
