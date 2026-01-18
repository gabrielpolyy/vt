import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Available seeds
const seeds = {
  user: () => import('./user.js'),
  exercises: () => import('./exercises.js'),
  'voice-profile': () => import('./voice-profile.js'),
  'exercise-attempts': () => import('./exercise-attempts.js'),
};

async function runSeeds(seedNames) {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // If no specific seeds requested, run all
    const toRun = seedNames.length > 0 ? seedNames : Object.keys(seeds);

    console.log('Running seeds...\n');

    for (const name of toRun) {
      if (!seeds[name]) {
        console.log(`  [skip] Unknown seed: ${name}`);
        continue;
      }

      console.log(`  [run]  ${name}`);
      try {
        const seedModule = await seeds[name]();
        await seedModule.seed(db);
        console.log(`  [done] ${name}`);
      } catch (err) {
        console.error(`  [FAIL] ${name}: ${err.message}`);
        throw err;
      }
    }

    console.log('\nSeeds complete.');
  } finally {
    await db.end();
  }
}

// Parse command line args (e.g., node runner.js user exercises)
const args = process.argv.slice(2);

runSeeds(args)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
