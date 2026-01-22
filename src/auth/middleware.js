import { verifyAccessToken } from '../utils/jwt.js';
import { getUserEntitlementVersion } from '../users/repository.js';

export async function authenticate(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      email: payload.email,
      isGuest: payload.isGuest || false,
      tier: payload.tier || 'free',
      subValidUntil: payload.subValidUntil,
      entV: payload.entV || 1,
    };
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

export async function requireRegistered(request, reply) {
  if (request.user.isGuest) {
    return reply.code(403).send({
      error: 'Account required',
      reason: 'account_required',
    });
  }
}

export async function requirePremium(request, reply) {
  // First check if registered
  if (request.user.isGuest) {
    return reply.code(403).send({
      error: 'Account required',
      reason: 'account_required',
    });
  }

  // Check tier
  if (request.user.tier !== 'premium') {
    return reply.code(403).send({
      error: 'Premium subscription required',
      reason: 'premium_required',
    });
  }

  // Check if subscription has expired based on token claims
  if (request.user.subValidUntil) {
    const now = Math.floor(Date.now() / 1000);
    if (request.user.subValidUntil < now) {
      return reply.code(409).send({
        error: 'Subscription expired, please refresh token',
        reason: 'refresh_required',
      });
    }
  }
}

export async function validateEntitlement(request, reply) {
  // For costly operations or when token is old, verify entitlement version
  const tokenAge = Date.now() / 1000 - (request.user.iat || 0);
  const isOldToken = tokenAge > 15 * 60; // 15 minutes

  // Only validate if premium user with old token
  if (request.user.tier === 'premium' && isOldToken) {
    const currentEntV = await getUserEntitlementVersion(request.user.id);
    if (currentEntV !== null && currentEntV !== request.user.entV) {
      return reply.code(409).send({
        error: 'Entitlement changed, please refresh token',
        reason: 'refresh_required',
      });
    }
  }
}
