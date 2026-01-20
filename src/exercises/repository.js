import { db } from '../db.js';

// Get exercise by slug
export async function getExerciseBySlug(slug) {
  const result = await db.query(
    `SELECT id, slug, type, category, name, description, definition
     FROM exercises
     WHERE slug = $1 AND is_active = TRUE AND user_id IS NULL`,
    [slug]
  );
  return result.rows[0] || null;
}

// Get exercises with optional type and category filters (excludes full definition blob)
export async function getExercises({ type, category, filterOut, userId } = {}) {
  const conditions = ['e.is_active = TRUE', 'e.user_id IS NULL'];
  const params = [];

  if (type) {
    params.push(type);
    conditions.push(`e.type = $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`e.category = $${params.length}`);
  }

  if (filterOut) {
    params.push(filterOut);
    conditions.push(`e.category != $${params.length}`);
  }

  // Build favorites join if userId provided
  let favoritesJoin = '';
  let isFavoriteSelect = 'FALSE as "isFavorite"';
  if (userId) {
    params.push(userId);
    favoritesJoin = `LEFT JOIN favorites f ON e.id = f.exercise_id AND f.user_id = $${params.length}`;
    isFavoriteSelect = '(f.id IS NOT NULL) as "isFavorite"';
  }

  const result = await db.query(
    `SELECT e.id, e.slug, e.type, e.category, e.name, e.description,
            e.definition->>'icon' as icon,
            e.definition->>'trackId' as "trackId",
            (e.definition->>'durationMs')::int as "durationMs",
            ${isFavoriteSelect}
     FROM exercises e
     ${favoritesJoin}
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.sort_order, e.name`,
    params
  );
  return result.rows;
}

// Record an attempt and update progress atomically
export async function recordAttempt(userId, exerciseId, { score, completed, result }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Insert the attempt
    const attemptResult = await client.query(
      `INSERT INTO exercise_attempts (user_id, exercise_id, score, completed, result)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, score, completed, result, created_at`,
      [userId, exerciseId, score, completed, result ? JSON.stringify(result) : null]
    );

    // Upsert progress: increment count, update best_score if higher, set last_played_at
    await client.query(
      `INSERT INTO exercise_progress (user_id, exercise_id, completed_count, best_score, last_played_at)
       VALUES ($1, $2, 1, $3, NOW())
       ON CONFLICT (user_id, exercise_id) DO UPDATE SET
         completed_count = exercise_progress.completed_count + 1,
         best_score = GREATEST(COALESCE(exercise_progress.best_score, 0), EXCLUDED.best_score),
         last_played_at = NOW()`,
      [userId, exerciseId, score]
    );

    await client.query('COMMIT');
    return attemptResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Get progress for all exercises for a user
export async function getAllProgress(userId) {
  const result = await db.query(
    `SELECT
       e.id AS exercise_id,
       e.slug,
       e.name,
       e.type,
       e.category,
       e.sort_order,
       e.definition,
       COALESCE(p.completed_count, 0) AS completed_count,
       p.best_score,
       p.last_played_at
     FROM exercises e
     LEFT JOIN exercise_progress p ON e.id = p.exercise_id AND p.user_id = $1
     WHERE e.is_active = TRUE AND e.user_id IS NULL
     ORDER BY e.sort_order, e.name`,
    [userId]
  );
  return result.rows;
}

// Get detailed progress for a single exercise
export async function getExerciseProgress(userId, exerciseId) {
  const result = await db.query(
    `SELECT
       completed_count,
       best_score,
       last_played_at
     FROM exercise_progress
     WHERE user_id = $1 AND exercise_id = $2`,
    [userId, exerciseId]
  );
  return result.rows[0] || { completed_count: 0, best_score: null, last_played_at: null };
}

// Get attempt history for an exercise
export async function getAttemptHistory(userId, exerciseId, limit = 10) {
  const result = await db.query(
    `SELECT id, score, completed, result, created_at
     FROM exercise_attempts
     WHERE user_id = $1 AND exercise_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, exerciseId, limit]
  );
  return result.rows;
}

// Get audio exercises paginated
export async function getAudioExercisesPaginated(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const result = await db.query(
    `SELECT id, name, is_active, level, genre, created_at
     FROM exercises
     WHERE category = 'audio' AND user_id IS NULL
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

// Get total count of audio exercises
export async function getAudioExercisesCount() {
  const result = await db.query(
    `SELECT COUNT(*) FROM exercises WHERE category = 'audio' AND user_id IS NULL`
  );
  return parseInt(result.rows[0].count, 10);
}

// Toggle exercise is_active status
export async function toggleExerciseActive(id) {
  await db.query(
    `UPDATE exercises SET is_active = NOT is_active WHERE id = $1`,
    [id]
  );
}

// Update exercise level
export async function updateExerciseLevel(id, level) {
  await db.query(
    `UPDATE exercises SET level = $2 WHERE id = $1`,
    [id, level]
  );
}

// Update exercise genre
export async function updateExerciseGenre(id, genre) {
  await db.query(
    `UPDATE exercises SET genre = $2 WHERE id = $1`,
    [id, genre]
  );
}

// Toggle favorite - inserts if not exists, deletes if exists
// Returns { isFavorite: boolean }
export async function toggleFavorite(userId, exerciseId) {
  const existing = await db.query(
    `SELECT id FROM favorites WHERE user_id = $1 AND exercise_id = $2`,
    [userId, exerciseId]
  );

  if (existing.rows.length > 0) {
    await db.query(
      `DELETE FROM favorites WHERE user_id = $1 AND exercise_id = $2`,
      [userId, exerciseId]
    );
    return { isFavorite: false };
  } else {
    await db.query(
      `INSERT INTO favorites (user_id, exercise_id) VALUES ($1, $2)`,
      [userId, exerciseId]
    );
    return { isFavorite: true };
  }
}

// Check if exercise is favorited by user
export async function isFavorite(userId, exerciseId) {
  const result = await db.query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND exercise_id = $2`,
    [userId, exerciseId]
  );
  return result.rows.length > 0;
}

// Get all user favorites
export async function getUserFavorites(userId) {
  const result = await db.query(
    `SELECT e.id, e.slug, e.name, e.type, e.category, f.created_at as favorited_at
     FROM favorites f
     JOIN exercises e ON f.exercise_id = e.id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}
