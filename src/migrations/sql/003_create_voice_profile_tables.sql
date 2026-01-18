-- Voice Profile (current state per user)
-- Stores computed lowest/highest MIDI notes with confidence score
CREATE TABLE voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    lowest_midi INTEGER,
    highest_midi INTEGER,
    confidence_score REAL DEFAULT 0,  -- 0.0-1.0 confidence in the range detection
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_profiles_user ON voice_profiles(user_id);

CREATE TRIGGER voice_profiles_updated_at
    BEFORE UPDATE ON voice_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Voice Exploration Sessions (history of each session)
-- Now stores full pitch samples for analysis and future ML training
CREATE TABLE voice_exploration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lowest_midi INTEGER,
    highest_midi INTEGER,
    pitch_samples JSONB,      -- Array of PitchSample objects with timestampMs, midiNote, frequency, confidence, segmentId
    confidence_score REAL,    -- Confidence score from the analysis algorithm
    level INTEGER,            -- Which level's warmup this session completed (1-5)
    node INTEGER,             -- Which node within the level (1-N)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_exploration_sessions_user ON voice_exploration_sessions(user_id, created_at DESC);
