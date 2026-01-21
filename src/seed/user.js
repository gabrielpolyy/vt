import { hashPassword } from '../utils/password.js';

const users = [
  {
    email: 'gabriel.policiuc@gmail.com',
    name: 'Gabriel',
    password: '12345678',
    isAdmin: false,
    level: 2,
    node: 2,
    isGuest: false,
  },
  {
    email: 'gabriel.policiuc@outlook.com',
    name: 'Gabriel (Admin)',
    password: '12345678',
    isAdmin: true,
    level: 1,
    node: 1,
    isGuest: false,
  },
];

export async function seed(db) {
  for (const user of users) {
    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [user.email]);

    if (existing.rows.length > 0) {
      console.log(`         User ${user.email} already exists.`);
      continue;
    }

    // Hash password
    const passwordHash = await hashPassword(user.password);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (email, email_verified, password_hash, name, is_admin, level, node, is_guest)
       VALUES ($1, true, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, is_admin, level, node, is_guest`,
      [user.email, passwordHash, user.name, user.isAdmin, user.level, user.node, user.isGuest]
    );

    const adminLabel = result.rows[0].is_admin ? ' (admin)' : '';
    console.log(`         Created user: ${result.rows[0].email}${adminLabel}`);
  }
}
