import { db } from '../db.js';

// Get all completed warmups for user (distinct level/node pairs)
export async function getCompletedWarmups(userId) {
  const result = await db.query(
    `SELECT DISTINCT level, node
     FROM voice_exploration_sessions
     WHERE user_id = $1 AND level IS NOT NULL AND node IS NOT NULL
     ORDER BY level, node`,
    [userId]
  );
  return result.rows.map((row) => ({ level: row.level, node: row.node }));
}

// Get exercise progress keyed by slug
export async function getExerciseProgressBySlug(userId) {
  const result = await db.query(
    `SELECT e.slug, p.best_score, p.completed_count, e.definition
     FROM exercise_progress p
     JOIN exercises e ON p.exercise_id = e.id
     WHERE p.user_id = $1`,
    [userId]
  );
  return result.rows;
}
