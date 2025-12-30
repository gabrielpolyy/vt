import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { db } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'sql');

async function runMigrations() {
  console.log('Running migrations...\n');

  // Ensure migrations tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get already-run migrations
  const { rows: executed } = await db.query(
    'SELECT name FROM _migrations ORDER BY name'
  );
  const executedSet = new Set(executed.map(r => r.name));

  // Get all migration files
  const files = await fs.readdir(MIGRATIONS_DIR);
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

  if (sqlFiles.length === 0) {
    console.log('No migration files found.');
    return;
  }

  // Run pending migrations
  for (const file of sqlFiles) {
    if (executedSet.has(file)) {
      console.log(`  [skip] ${file}`);
      continue;
    }

    console.log(`  [run]  ${file}`);
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  [FAIL] ${file}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('\nMigrations complete.');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
