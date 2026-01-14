import { db } from '../db.js';

// Get exercise by slug
export async function getExerciseBySlug(slug) {
  const result = await db.query(
    `SELECT id, slug, type, name, description, icon, definition
     FROM exercises
     WHERE slug = $1 AND is_active = TRUE AND user_id IS NULL`,
    [slug]
  );
  return result.rows[0] || null;
}

// Get all global exercises
export async function getAllExercises() {
  const result = await db.query(
    `SELECT id, slug, type, name, description, icon, definition
     FROM exercises
     WHERE is_active = TRUE AND user_id IS NULL
     ORDER BY sort_order, name`
  );
  return result.rows;
}

// Get exercises by type
export async function getExercisesByType(type) {
  const result = await db.query(
    `SELECT id, slug, type, name, description, icon, definition
     FROM exercises
     WHERE type = $1 AND is_active = TRUE AND user_id IS NULL
     ORDER BY sort_order, name`,
    [type]
  );
  return result.rows;
}
