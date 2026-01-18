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

// Upsert the user's voice profile (overwrites with most recent session)
export async function upsertVoiceProfile(userId, lowestMidi, highestMidi) {
  const result = await db.query(
    `INSERT INTO voice_profiles (user_id, lowest_midi, highest_midi)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE SET
      lowest_midi = COALESCE(EXCLUDED.lowest_midi, voice_profiles.lowest_midi),
      highest_midi = COALESCE(EXCLUDED.highest_midi, voice_profiles.highest_midi),
      updated_at = NOW()
    RETURNING *`,
    [userId, lowestMidi, highestMidi]
  );
  return result.rows[0];
}

// Save a voice exploration session (history)
export async function saveVoiceExplorationSession(userId, lowestMidi, highestMidi) {
  const result = await db.query(
    `INSERT INTO voice_exploration_sessions (user_id, lowest_midi, highest_midi)
    VALUES ($1, $2, $3)
    RETURNING *`,
    [userId, lowestMidi, highestMidi]
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

// Save a voice exploration session with pitch samples
export async function saveSessionWithSamples(
  userId,
  lowestMidi,
  highestMidi,
  samples,
  confidenceScore
) {
  const result = await db.query(
    `INSERT INTO voice_exploration_sessions
      (user_id, lowest_midi, highest_midi, pitch_samples, confidence_score)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [userId, lowestMidi, highestMidi, JSON.stringify(samples), confidenceScore]
  );
  return result.rows[0];
}

// Upsert voice profile with confidence score (overwrites with most recent session)
export async function upsertVoiceProfileWithConfidence(
  userId,
  lowestMidi,
  highestMidi,
  confidenceScore
) {
  const result = await db.query(
    `INSERT INTO voice_profiles (user_id, lowest_midi, highest_midi, confidence_score)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id) DO UPDATE SET
      lowest_midi = COALESCE(EXCLUDED.lowest_midi, voice_profiles.lowest_midi),
      highest_midi = COALESCE(EXCLUDED.highest_midi, voice_profiles.highest_midi),
      confidence_score = COALESCE(EXCLUDED.confidence_score, voice_profiles.confidence_score),
      updated_at = NOW()
    RETURNING *`,
    [userId, lowestMidi, highestMidi, confidenceScore]
  );
  return result.rows[0];
}
