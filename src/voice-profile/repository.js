import { db } from '../db.js';

// Get the user's current voice profile
export async function getVoiceProfile(userId) {
  const result = await db.query(
    `SELECT lowest_midi, highest_midi, updated_at
    FROM voice_profiles
    WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

// Upsert the user's voice profile (expanding ranges)
export async function upsertVoiceProfile(userId, lowestMidi, highestMidi) {
  const result = await db.query(
    `INSERT INTO voice_profiles (user_id, lowest_midi, highest_midi)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE SET
      lowest_midi = LEAST(COALESCE(voice_profiles.lowest_midi, EXCLUDED.lowest_midi), EXCLUDED.lowest_midi),
      highest_midi = GREATEST(COALESCE(voice_profiles.highest_midi, EXCLUDED.highest_midi), EXCLUDED.highest_midi),
      updated_at = NOW()
    RETURNING *`,
    [userId, lowestMidi, highestMidi]
  );
  return result.rows[0];
}

// Save a voice exploration session (history)
export async function saveVoiceExplorationSession(userId, lowestMidi, highestMidi, durationMs) {
  const result = await db.query(
    `INSERT INTO voice_exploration_sessions (user_id, lowest_midi, highest_midi, duration_ms)
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [userId, lowestMidi, highestMidi, durationMs]
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
