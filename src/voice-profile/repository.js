import { db } from '../db.js';

// Get the user's current voice profile
export async function getVoiceProfile(userId) {
  const result = await db.query(
    `SELECT
      comfortable_low_min, comfortable_low_max,
      lowest_safe_min, lowest_safe_max,
      comfortable_mid_min, comfortable_mid_max,
      comfortable_high_min, comfortable_high_max,
      highest_safe_min, highest_safe_max,
      updated_at
    FROM voice_profiles
    WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

// Upsert the user's voice profile (expanding ranges)
export async function upsertVoiceProfile(userId, segments) {
  const result = await db.query(
    `INSERT INTO voice_profiles (
      user_id,
      comfortable_low_min, comfortable_low_max,
      lowest_safe_min, lowest_safe_max,
      comfortable_mid_min, comfortable_mid_max,
      comfortable_high_min, comfortable_high_max,
      highest_safe_min, highest_safe_max
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (user_id) DO UPDATE SET
      comfortable_low_min = LEAST(COALESCE(voice_profiles.comfortable_low_min, EXCLUDED.comfortable_low_min), EXCLUDED.comfortable_low_min),
      comfortable_low_max = GREATEST(COALESCE(voice_profiles.comfortable_low_max, EXCLUDED.comfortable_low_max), EXCLUDED.comfortable_low_max),
      lowest_safe_min = LEAST(COALESCE(voice_profiles.lowest_safe_min, EXCLUDED.lowest_safe_min), EXCLUDED.lowest_safe_min),
      lowest_safe_max = GREATEST(COALESCE(voice_profiles.lowest_safe_max, EXCLUDED.lowest_safe_max), EXCLUDED.lowest_safe_max),
      comfortable_mid_min = LEAST(COALESCE(voice_profiles.comfortable_mid_min, EXCLUDED.comfortable_mid_min), EXCLUDED.comfortable_mid_min),
      comfortable_mid_max = GREATEST(COALESCE(voice_profiles.comfortable_mid_max, EXCLUDED.comfortable_mid_max), EXCLUDED.comfortable_mid_max),
      comfortable_high_min = LEAST(COALESCE(voice_profiles.comfortable_high_min, EXCLUDED.comfortable_high_min), EXCLUDED.comfortable_high_min),
      comfortable_high_max = GREATEST(COALESCE(voice_profiles.comfortable_high_max, EXCLUDED.comfortable_high_max), EXCLUDED.comfortable_high_max),
      highest_safe_min = LEAST(COALESCE(voice_profiles.highest_safe_min, EXCLUDED.highest_safe_min), EXCLUDED.highest_safe_min),
      highest_safe_max = GREATEST(COALESCE(voice_profiles.highest_safe_max, EXCLUDED.highest_safe_max), EXCLUDED.highest_safe_max),
      updated_at = NOW()
    RETURNING *`,
    [
      userId,
      segments.comfortable_low?.minMidi ?? null,
      segments.comfortable_low?.maxMidi ?? null,
      segments.lowest_safe?.minMidi ?? null,
      segments.lowest_safe?.maxMidi ?? null,
      segments.comfortable_mid?.minMidi ?? null,
      segments.comfortable_mid?.maxMidi ?? null,
      segments.comfortable_high?.minMidi ?? null,
      segments.comfortable_high?.maxMidi ?? null,
      segments.highest_safe?.minMidi ?? null,
      segments.highest_safe?.maxMidi ?? null,
    ]
  );
  return result.rows[0];
}

// Save a voice exploration session (history)
export async function saveVoiceExplorationSession(userId, segments, durationMs) {
  const result = await db.query(
    `INSERT INTO voice_exploration_sessions (
      user_id,
      comfortable_low_min, comfortable_low_max,
      lowest_safe_min, lowest_safe_max,
      comfortable_mid_min, comfortable_mid_max,
      comfortable_high_min, comfortable_high_max,
      highest_safe_min, highest_safe_max,
      duration_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      userId,
      segments.comfortable_low?.minMidi ?? null,
      segments.comfortable_low?.maxMidi ?? null,
      segments.lowest_safe?.minMidi ?? null,
      segments.lowest_safe?.maxMidi ?? null,
      segments.comfortable_mid?.minMidi ?? null,
      segments.comfortable_mid?.maxMidi ?? null,
      segments.comfortable_high?.minMidi ?? null,
      segments.comfortable_high?.maxMidi ?? null,
      segments.highest_safe?.minMidi ?? null,
      segments.highest_safe?.maxMidi ?? null,
      durationMs,
    ]
  );
  return result.rows[0];
}

// Get voice exploration session history for a user
export async function getVoiceExplorationHistory(userId, limit = 10) {
  const result = await db.query(
    `SELECT * FROM voice_exploration_sessions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}
