import pg from 'pg';

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.end();
  process.exit(0);
});

