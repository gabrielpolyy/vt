-- Voice Profile (current state per user)
-- Simplified: just lowest and highest MIDI notes
CREATE TABLE voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    lowest_midi INTEGER,
    highest_midi INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_profiles_user ON voice_profiles(user_id);

CREATE TRIGGER voice_profiles_updated_at
    BEFORE UPDATE ON voice_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Voice Exploration Sessions (history of each session)
CREATE TABLE voice_exploration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lowest_midi INTEGER,
    highest_midi INTEGER,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_exploration_sessions_user ON voice_exploration_sessions(user_id, created_at DESC);
