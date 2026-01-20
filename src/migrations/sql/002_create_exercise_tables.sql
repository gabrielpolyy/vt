-- Exercises (global and user-specific)
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pitch', 'highway', 'warmup')),
    category VARCHAR(30) CHECK (category IN ('pitch_matching', 'scale_runs', 'interval_training', 'highway', 'audio')),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    level INTEGER,
    genre VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_global ON exercises(sort_order) WHERE user_id IS NULL;
CREATE INDEX idx_exercises_user ON exercises(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- User progress on exercises
CREATE TABLE exercise_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    completed_count INTEGER DEFAULT 0,
    best_score INTEGER,
    last_played_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_exercise_progress_user ON exercise_progress(user_id);
CREATE INDEX idx_exercise_progress_exercise ON exercise_progress(exercise_id);

CREATE TRIGGER exercise_progress_updated_at
    BEFORE UPDATE ON exercise_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Attempt history
CREATE TABLE exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    score INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercise_attempts_user ON exercise_attempts(user_id, created_at DESC);
CREATE INDEX idx_exercise_attempts_exercise ON exercise_attempts(exercise_id);
