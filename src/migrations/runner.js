import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'sql');

// Parse database name from connection string
function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  const dbName = parsed.pathname.slice(1); // Remove leading /
  // Create URL for postgres system database
  parsed.pathname = '/postgres';
  return { dbName, systemUrl: parsed.toString() };
}

// Ensure database exists, create if not
async function ensureDatabaseExists() {
  const { dbName, systemUrl } = parseDatabaseUrl(process.env.DATABASE_URL);

  const systemPool = new Pool({ connectionString: systemUrl });

  try {
    // Check if database exists
    const result = await systemPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      // Can't use parameterized query for CREATE DATABASE
      await systemPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created.\n`);
    }
  } finally {
    await systemPool.end();
  }
}

async function runMigrations() {
  // Ensure database exists first
  await ensureDatabaseExists();

  // Now connect to the actual database
  const db = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('Running migrations...\n');

  try {
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
    const executedSet = new Set(executed.map((r) => r.name));

    // Get all migration files
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

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
  } finally {
    await db.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
