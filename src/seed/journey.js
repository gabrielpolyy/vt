import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function seed(db) {
  const existing = await db.query('SELECT COUNT(*) as count FROM journeys');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('         Journeys table already has entries. Skipping.');
    return;
  }

  const jsonPath = path.join(__dirname, 'journey.json');
  const json = await fs.readFile(jsonPath, 'utf-8');
  await db.query('INSERT INTO journeys (name, definition) VALUES ($1, $2)', ['default', json]);
  console.log('         Seeded 1 journey.');
}
