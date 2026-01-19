-- Migration: Create user_activity table for tracking daily activity (for streaks without recording attempts)
-- This allows practice mode to maintain streaks without recording exercise scores/stats

CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(50) NOT NULL DEFAULT 'practice',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, activity_date, source)
);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(user_id, activity_date);
