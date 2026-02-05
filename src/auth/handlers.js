import { authConfig } from '../config/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  findUserByEmail,
  findUserById,
  createUser,
  findOAuthAccount,
  createOAuthUser,
  linkOAuthAccount,
  createGuestUser,
  claimGuestAccount,
  claimGuestWithOAuth,
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
import {
  createPasswordResetToken,
  executePasswordReset,
} from './passwordResetRepository.js';
import { sendEmail, isEmailEnabled } from '../email/index.js';
import { passwordResetEmail } from '../email/templates/passwordReset.js';

export async function register(request, reply) {
  const { email, password, name } = request.body;

  if (!email || !password || !name) {
    return reply.code(400).send({ error: 'Email, password, and name are required' });
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
    const name = appleUser?.name
      ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
      : null;

    const email = providerEmail || `apple_${providerUserId}@privaterelay.appleid.com`;

    // Check if user exists with this email (e.g., registered with email/password)
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      // Link Apple account to existing user
      await linkOAuthAccount({
        userId: existingUser.id,
        provider: 'apple',
        providerUserId,
        providerEmail,
      });
      user = existingUser;
      isNewUser = false;
    } else {
      // Create new user with Apple account
      user = await createOAuthUser({
        email,
        name,
        provider: 'apple',
        providerUserId,
        providerEmail,
      });
      isNewUser = true;
    }
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

  // Generate new tokens with subscription data
  const user = {
    id: tokenRecord.user_id,
    email: tokenRecord.email,
    is_guest: tokenRecord.is_guest,
    tier: tokenRecord.tier,
    subscription_valid_until: tokenRecord.subscription_valid_until,
    entitlement_version: tokenRecord.entitlement_version,
  };

  const tokens = generateTokens(user);
  await saveRefreshToken({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    deviceInfo: getDeviceInfo(request),
    ipAddress: request.ip,
  });

  return {
    ...tokens,
    tier: user.tier,
    subscriptionValidUntil: user.subscription_valid_until,
  };
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
    isGuest: user.is_guest,
    tier: user.tier,
    subscriptionValidUntil: user.subscription_valid_until,
    appAccountToken: user.app_account_token,
    createdAt: user.created_at,
  };
}

export async function checkEmail(request, reply) {
  const { email } = request.query;

  if (!email) {
    return reply.code(400).send({ error: 'Email is required' });
  }

  const existingUser = await findUserByEmail(email);
  return { exists: !!existingUser };
}

export async function guestLogin(request, reply) {
  const user = await createGuestUser();

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
      isGuest: true,
    },
    ...tokens,
  });
}

export async function claimWithPassword(request, reply) {
  const { email, password, name } = request.body;
  const userId = request.user.id;

  if (!email || !password || !name) {
    return reply.code(400).send({ error: 'Email, password, and name are required' });
  }

  if (password.length < authConfig.password.minLength) {
    return reply.code(400).send({
      error: `Password must be at least ${authConfig.password.minLength} characters`,
    });
  }

  // Check if user is actually a guest
  const currentUser = await findUserById(userId);
  if (!currentUser || !currentUser.is_guest) {
    return reply.code(403).send({ error: 'Only guest accounts can be claimed' });
  }

  // Check if email is already taken
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return reply.code(409).send({ error: 'Email already registered' });
  }

  const passwordHash = await hashPassword(password);
  const user = await claimGuestAccount({ userId, email, passwordHash, name });

  if (!user) {
    return reply.code(500).send({ error: 'Failed to claim account' });
  }

  // Revoke old tokens and issue new ones
  await revokeAllUserTokens(userId);

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
      isGuest: false,
    },
    ...tokens,
  };
}

export async function claimWithApple(request, reply) {
  const { identityToken, user: appleUser } = request.body;
  const userId = request.user.id;

  if (!identityToken) {
    return reply.code(400).send({ error: 'Identity token is required' });
  }

  // Check if user is actually a guest
  const currentUser = await findUserById(userId);
  if (!currentUser || !currentUser.is_guest) {
    return reply.code(403).send({ error: 'Only guest accounts can be claimed' });
  }

  let applePayload;
  try {
    applePayload = await verifyAppleToken(identityToken);
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid Apple identity token' });
  }

  const providerUserId = applePayload.sub;
  const providerEmail = applePayload.email;

  // Check if this Apple account is already linked to another user
  const existingOAuth = await findOAuthAccount('apple', providerUserId);
  if (existingOAuth) {
    return reply.code(409).send({ error: 'This Apple account is already linked to another user' });
  }

  // Check if email is already taken (if Apple provided one)
  if (providerEmail) {
    const existingUser = await findUserByEmail(providerEmail);
    if (existingUser) {
      return reply.code(409).send({ error: 'Email already registered' });
    }
  }

  const name = appleUser?.name
    ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
    : null;

  const email = providerEmail || `apple_${providerUserId}@privaterelay.appleid.com`;

  const user = await claimGuestWithOAuth({
    userId,
    email,
    name,
    provider: 'apple',
    providerUserId,
    providerEmail,
  });

  // Revoke old tokens and issue new ones
  await revokeAllUserTokens(userId);

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
      isGuest: false,
    },
    ...tokens,
  };
}

export async function requestPasswordReset(request, reply) {
  const { email } = request.body;

  if (!email) {
    return reply.code(400).send({ error: 'Email is required' });
  }

  // Always return success to prevent email enumeration
  const successResponse = { message: 'If an account exists with this email, a reset link has been sent' };

  if (!isEmailEnabled()) {
    request.log.warn('Password reset requested but email service is disabled');
    return successResponse;
  }

  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    // User doesn't exist or uses OAuth only - return success anyway
    return successResponse;
  }

  try {
    const token = await createPasswordResetToken(user.id);
    const appUrl = process.env.APP_URL || 'https://pitchhighway.com';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const emailContent = passwordResetEmail({ resetUrl, expiresInMinutes: 60 });
    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (err) {
    request.log.error({ err }, 'Failed to send password reset email');
    // Still return success to prevent enumeration
  }

  return successResponse;
}

export async function resetPassword(request, reply) {
  const { token, password } = request.body;

  if (!token || !password) {
    return reply.code(400).send({ error: 'Token and password are required' });
  }

  if (password.length < authConfig.password.minLength) {
    return reply.code(400).send({
      error: `Password must be at least ${authConfig.password.minLength} characters`,
    });
  }

  const passwordHash = await hashPassword(password);
  const result = await executePasswordReset(token, passwordHash);

  if (!result) {
    return reply.code(400).send({ error: 'Invalid or expired reset token' });
  }

  return { message: 'Password has been reset successfully' };
}
