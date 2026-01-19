-- Migration: Create jobs table for job queue
-- This creates the table and notification trigger for the worker

CREATE TABLE IF NOT EXISTS jobs (
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
CREATE INDEX IF NOT EXISTS idx_jobs_claim ON jobs (status, priority, created_at)
    WHERE status = 'pending';

-- Index for monitoring running jobs
CREATE INDEX IF NOT EXISTS idx_jobs_running ON jobs (status, locked_by)
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
DROP TRIGGER IF EXISTS jobs_notify_trigger ON jobs;
CREATE TRIGGER jobs_notify_trigger
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_job();
