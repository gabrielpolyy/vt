import crypto from 'crypto';
import { db } from '../db.js';

const TOKEN_EXPIRY_HOURS = 1;

export function generateResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(userId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Invalidate any existing tokens for this user (with row lock)
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );

    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Create new token
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    await client.query('COMMIT');
    return token;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findValidResetToken(token) {
  const tokenHash = hashResetToken(token);
  const { rows } = await db.query(
    `SELECT prt.*, u.id as user_id, u.email, u.name
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1
       AND prt.used_at IS NULL
       AND prt.expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function executePasswordReset(token, passwordHash) {
  const tokenHash = hashResetToken(token);
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Find and lock the token row
    const { rows } = await client.query(
      `SELECT prt.id, prt.user_id
       FROM password_reset_tokens prt
       WHERE prt.token_hash = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (!rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const { id: tokenId, user_id: userId } = rows[0];

    // Update password
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );

    // Mark this token and all other tokens for this user as used
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );

    // Revoke all refresh tokens
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    await client.query('COMMIT');
    return { userId, tokenId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
