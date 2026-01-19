import { db } from '../db.js';

export async function insertJob(payload, priority = 5) {
  const result = await db.query(
    'INSERT INTO jobs (payload, priority) VALUES ($1, $2) RETURNING id',
    [JSON.stringify(payload), priority]
  );
  return result.rows[0].id;
}
