import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function seed(db) {
  // Check if exercises already exist
  const existing = await db.query('SELECT COUNT(*) as count FROM exercises');
  const count = parseInt(existing.rows[0].count);

  if (count > 0) {
    console.log(`         Exercises table already has ${count} entries. Skipping.`);
    return;
  }

  // Read and execute the SQL seed file
  const sqlPath = path.join(__dirname, 'exercises.sql');
  const sql = await fs.readFile(sqlPath, 'utf-8');

  await db.query(sql);

  // Get final count
  const result = await db.query('SELECT COUNT(*) as count FROM exercises');
  console.log(`         Seeded ${result.rows[0].count} exercises.`);
}
