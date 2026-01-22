import { db } from '../db.js';
import { authConfig } from '../config/auth.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../utils/jwt.js';

export function generateTokens(user) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    isGuest: user.is_guest || false,
    tier: user.tier || 'free',
    subValidUntil: user.subscription_valid_until
      ? Math.floor(new Date(user.subscription_valid_until).getTime() / 1000)
      : null,
    entV: user.entitlement_version || 1,
  });

  const refreshToken = generateRefreshToken();

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export async function saveRefreshToken({ userId, refreshToken, deviceInfo, ipAddress }) {
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + authConfig.refreshToken.expiryDays);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, deviceInfo || null, ipAddress || null, expiresAt]
  );
}

export async function findRefreshToken(refreshToken) {
  const tokenHash = hashRefreshToken(refreshToken);
  const { rows } = await db.query(
    `SELECT rt.*, u.id as user_id, u.email, u.name, u.email_verified, u.is_guest,
            u.tier, u.subscription_valid_until, u.entitlement_version, u.app_account_token
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1
       AND rt.revoked_at IS NULL
       AND rt.expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function revokeRefreshToken(refreshToken) {
  const tokenHash = hashRefreshToken(refreshToken);
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
    [tokenHash]
  );
}

export async function revokeAllUserTokens(userId) {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

export function getDeviceInfo(request) {
  const userAgent = request.headers['user-agent'] || '';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    return 'iOS';
  }
  if (userAgent.includes('Android')) {
    return 'Android';
  }
  if (userAgent.includes('Chrome')) {
    return 'Chrome';
  }
  if (userAgent.includes('Safari')) {
    return 'Safari';
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox';
  }
  return 'Unknown';
}
