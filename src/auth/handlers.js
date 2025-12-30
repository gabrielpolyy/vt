import { authConfig } from '../config/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  findUserByEmail,
  findUserById,
  createUser,
  findOAuthAccount,
  createOAuthUser,
} from '../users/repository.js';
import {
  generateTokens,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getDeviceInfo,
} from './services.js';
import { verifyAppleToken } from './apple.js';

export async function register(request, reply) {
  const { email, password, name } = request.body;

  if (!email || !password) {
    return reply.code(400).send({ error: 'Email and password are required' });
  }

  if (password.length < authConfig.password.minLength) {
    return reply.code(400).send({
      error: `Password must be at least ${authConfig.password.minLength} characters`,
    });
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return reply.code(409).send({ error: 'Email already registered' });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash, name });

  const tokens = generateTokens(user);
  await saveRefreshToken({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    deviceInfo: getDeviceInfo(request),
    ipAddress: request.ip,
  });

  return reply.code(201).send({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  });
}

export async function login(request, reply) {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.code(400).send({ error: 'Email and password are required' });
  }

  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const isValid = await verifyPassword(user.password_hash, password);
  if (!isValid) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const tokens = generateTokens(user);
  await saveRefreshToken({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    deviceInfo: getDeviceInfo(request),
    ipAddress: request.ip,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  };
}

export async function appleAuth(request, reply) {
  const { identityToken, user: appleUser } = request.body;

  if (!identityToken) {
    return reply.code(400).send({ error: 'Identity token is required' });
  }

  let applePayload;
  try {
    applePayload = await verifyAppleToken(identityToken);
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid Apple identity token' });
  }

  const providerUserId = applePayload.sub;
  const providerEmail = applePayload.email;

  // Check if user already exists with this Apple account
  let oauthAccount = await findOAuthAccount('apple', providerUserId);
  let user;
  let isNewUser = false;

  if (oauthAccount) {
    user = {
      id: oauthAccount.user_id,
      email: oauthAccount.email,
      name: oauthAccount.name,
    };
  } else {
    // Create new user
    const name = appleUser?.name
      ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
      : null;

    const email = providerEmail || `apple_${providerUserId}@privaterelay.appleid.com`;

    user = await createOAuthUser({
      email,
      name,
      provider: 'apple',
      providerUserId,
      providerEmail,
    });
    isNewUser = true;
  }

  const tokens = generateTokens(user);
  await saveRefreshToken({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    deviceInfo: getDeviceInfo(request),
    ipAddress: request.ip,
  });

  return reply.code(isNewUser ? 201 : 200).send({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    ...tokens,
    isNewUser,
  });
}

export async function refresh(request, reply) {
  const { refreshToken } = request.body;

  if (!refreshToken) {
    return reply.code(400).send({ error: 'Refresh token is required' });
  }

  const tokenRecord = await findRefreshToken(refreshToken);
  if (!tokenRecord) {
    return reply.code(401).send({ error: 'Invalid or expired refresh token' });
  }

  // Revoke old token (rotation)
  await revokeRefreshToken(refreshToken);

  // Generate new tokens
  const user = {
    id: tokenRecord.user_id,
    email: tokenRecord.email,
  };

  const tokens = generateTokens(user);
  await saveRefreshToken({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    deviceInfo: getDeviceInfo(request),
    ipAddress: request.ip,
  });

  return tokens;
}

export async function logout(request) {
  const { refreshToken, allDevices } = request.body;

  if (allDevices) {
    await revokeAllUserTokens(request.user.id);
  } else if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  return { success: true };
}

export async function me(request, reply) {
  const user = await findUserById(request.user.id);

  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.email_verified,
    createdAt: user.created_at,
  };
}
