import { hashPassword } from '../utils/password.js';

export async function seed(db) {
  const email = 'gabriel.policiuc@gmail.com';
  const name = 'Gabriel';
  const password = '12345678';

  // Check if user already exists
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    console.log(`         User ${email} already exists.`);
    return;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert user
  const result = await db.query(
    `INSERT INTO users (email, email_verified, password_hash, name)
     VALUES ($1, true, $2, $3)
     RETURNING id, email, name`,
    [email, passwordHash, name]
  );

  console.log(`         Created user: ${result.rows[0].email}`);
}
