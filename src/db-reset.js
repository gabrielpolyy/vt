import 'dotenv/config';
import { execSync } from 'child_process';

const url = new URL(process.env.DATABASE_URL);
const dbName = url.pathname.slice(1);
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: url.username,
  PGPASSWORD: url.password,
};

console.log(`Dropping database "${dbName}"...`);
try {
  execSync(`dropdb ${dbName} --if-exists`, { env, stdio: 'inherit' });
} catch (e) {
  console.error('Failed to drop database');
  process.exit(1);
}

console.log(`Creating database "${dbName}"...`);
try {
  execSync(`createdb ${dbName}`, { env, stdio: 'inherit' });
} catch (e) {
  console.error('Failed to create database');
  process.exit(1);
}

console.log('Running migrations...');
execSync('npm run migrate', { stdio: 'inherit' });

console.log('Running seeds...');
execSync('npm run seed', { stdio: 'inherit' });

console.log('Database reset complete!');
