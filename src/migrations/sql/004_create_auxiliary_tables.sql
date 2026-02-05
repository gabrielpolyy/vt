-- User activity table for tracking daily activity (for streaks without recording attempts)
-- This allows practice mode to maintain streaks without recording exercise scores/stats

CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(50) NOT NULL DEFAULT 'practice',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, activity_date, source)
);

-- Index for efficient lookups by user
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_date ON user_activity(user_id, activity_date);

-- Jobs table for job queue
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    locked_by VARCHAR(100),
    error_message TEXT,

    CHECK (status IN ('pending', 'running', 'done', 'failed'))
);

-- Index for efficient job claiming
CREATE INDEX idx_jobs_claim ON jobs (status, priority, created_at)
    WHERE status = 'pending';

-- Index for monitoring running jobs
CREATE INDEX idx_jobs_running ON jobs (status, locked_by)
    WHERE status = 'running';

-- Function to notify workers of new jobs
CREATE OR REPLACE FUNCTION notify_new_job()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        PERFORM pg_notify('new_jobs', NEW.id::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to send notifications on new jobs
CREATE TRIGGER jobs_notify_trigger
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_job();
