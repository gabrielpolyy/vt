import { db } from '../db.js';

// Get the default journey definition
export async function getJourneyDefinition() {
  const result = await db.query(
    `SELECT definition FROM journeys WHERE name = 'default' LIMIT 1`
  );
  return result.rows[0] || null;
}

// Get journey definition by ID
export async function getJourneyDefinitionById(journeyId) {
  const result = await db.query(
    `SELECT id, name, definition, display_name, description, icon FROM journeys WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [journeyId]
  );
  return result.rows[0] || null;
}

// Get the default journey ID
export async function getDefaultJourneyId() {
  const result = await db.query(
    `SELECT id FROM journeys WHERE name = 'default' LIMIT 1`
  );
  return result.rows[0]?.id || null;
}

// Get all active journeys with user progress
export async function getJourneyList(userId) {
  const result = await db.query(
    `SELECT j.id, j.name, j.display_name, j.description, j.icon, j.definition,
            COALESCE(ujp.level, 1) as level, COALESCE(ujp.node, 1) as node,
            ujp.last_active_at, ujp.started_at
     FROM journeys j
     LEFT JOIN user_journey_progress ujp ON ujp.journey_id = j.id AND ujp.user_id = $1
     WHERE j.is_active = TRUE
     ORDER BY j.sort_order`,
    [userId]
  );
  return result.rows;
}

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

// Get exercise progress keyed by slug (with effective access level computed for audio exercises)
// Returns ALL active exercises, not just those with user progress
export async function getExerciseProgressBySlug(userId) {
  const result = await db.query(
    `SELECT e.slug, p.best_score, p.completed_count, e.definition,
            CASE
              WHEN e.category = 'audio' AND e.sort_order = (
                SELECT MIN(sort_order) FROM exercises
                WHERE category = 'audio' AND user_id IS NULL AND is_active = TRUE
              ) THEN 'registered'
              WHEN e.category = 'audio' THEN 'premium'
              ELSE e.access_level
            END AS access_level
     FROM exercises e
     LEFT JOIN exercise_progress p ON p.exercise_id = e.id AND p.user_id = $1
     WHERE e.user_id IS NULL AND e.is_active = TRUE`,
    [userId]
  );
  return result.rows;
}
