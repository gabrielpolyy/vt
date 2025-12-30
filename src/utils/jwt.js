import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authConfig } from '../config/auth.js';

export function signAccessToken(payload) {
  return jwt.sign(
    { ...payload, type: 'access' },
    authConfig.jwt.secret,
    {
      algorithm: authConfig.jwt.algorithm,
      expiresIn: authConfig.jwt.accessTokenExpiry,
    }
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, authConfig.jwt.secret, {
    algorithms: [authConfig.jwt.algorithm],
  });
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return payload;
}

export function generateRefreshToken() {
  return crypto.randomBytes(authConfig.refreshToken.byteLength).toString('base64url');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
