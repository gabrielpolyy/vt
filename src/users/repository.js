import { db } from '../db.js';

export async function findUserByEmail(email) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await db.query(
    'SELECT id, email, email_verified, name, is_guest, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ email, passwordHash, name }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, email_verified, name, created_at, updated_at`,
    [email.toLowerCase(), passwordHash, name || null]
  );
  return rows[0];
}

export async function findOAuthAccount(provider, providerUserId) {
  const { rows } = await db.query(
    `SELECT oa.*, u.id as user_id, u.email, u.name, u.email_verified
     FROM oauth_accounts oa
     JOIN users u ON u.id = oa.user_id
     WHERE oa.provider = $1 AND oa.provider_user_id = $2`,
    [provider, providerUserId]
  );
  return rows[0] || null;
}

export async function createOAuthUser({ email, name, provider, providerUserId, providerEmail }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, email_verified, name)
       VALUES ($1, TRUE, $2)
       RETURNING id, email, email_verified, name, created_at, updated_at`,
      [email.toLowerCase(), name || null]
    );
    const user = userRows[0];

    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
       VALUES ($1, $2, $3, $4)`,
      [user.id, provider, providerUserId, providerEmail]
    );

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function linkOAuthAccount({ userId, provider, providerUserId, providerEmail }) {
  await db.query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
     VALUES ($1, $2, $3, $4)`,
    [userId, provider, providerUserId, providerEmail]
  );
}

export async function createGuestUser() {
  const { rows } = await db.query(
    `INSERT INTO users (is_guest)
     VALUES (TRUE)
     RETURNING id, email, email_verified, name, is_guest, created_at, updated_at`
  );
  return rows[0];
}

export async function claimGuestAccount({ userId, email, passwordHash, name }) {
  const { rows } = await db.query(
    `UPDATE users
     SET email = $2, password_hash = $3, name = $4, is_guest = FALSE, updated_at = NOW()
     WHERE id = $1 AND is_guest = TRUE
     RETURNING id, email, email_verified, name, is_guest, created_at, updated_at`,
    [userId, email.toLowerCase(), passwordHash, name || null]
  );
  return rows[0] || null;
}

export async function claimGuestWithOAuth({ userId, email, name, provider, providerUserId, providerEmail }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      `UPDATE users
       SET email = $2, email_verified = TRUE, name = $3, is_guest = FALSE, updated_at = NOW()
       WHERE id = $1 AND is_guest = TRUE
       RETURNING id, email, email_verified, name, is_guest, created_at, updated_at`,
      [userId, email.toLowerCase(), name || null]
    );

    if (!userRows[0]) {
      throw new Error('User not found or not a guest');
    }

    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
       VALUES ($1, $2, $3, $4)`,
      [userId, provider, providerUserId, providerEmail]
    );

    await client.query('COMMIT');
    return userRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateUserLastActive(userId) {
  await db.query(
    'UPDATE users SET last_active_at = NOW() WHERE id = $1',
    [userId]
  );
}

export async function deleteInactiveGuests(inactiveDays = 30) {
  const { rowCount } = await db.query(
    `DELETE FROM users
     WHERE is_guest = TRUE
       AND last_active_at < NOW() - INTERVAL '1 day' * $1`,
    [inactiveDays]
  );
  return rowCount;
}
