-- Remove warmup type from exercises
-- Drop existing constraint and recreate without 'warmup'

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_type_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_type_check CHECK (type IN ('pitch', 'highway'));

-- Delete any existing warmup exercises
DELETE FROM exercises WHERE type = 'warmup';
