import { authConfig } from '../config/auth.js';
import {
  findUserById,
  findUserByAppAccountToken,
  updateUserTier,
} from '../users/repository.js';
import {
  findSubscriptionByTransactionId,
  createSubscription,
  updateSubscription,
  linkSubscriptionToUser,
} from './repository.js';
import { decodeSignedTransaction } from './apple-jws.js';
import { generateTokens, saveRefreshToken, getDeviceInfo } from '../auth/services.js';

// Convert Apple milliseconds timestamp to Date
function appleTimestampToDate(ms) {
  return new Date(ms);
}

export async function verify(request, reply) {
  const { signedTransaction } = request.body;

  if (!signedTransaction) {
    return reply.code(400).send({ error: 'Signed transaction is required' });
  }

  let transactionInfo;
  try {
    transactionInfo = await decodeSignedTransaction(signedTransaction);
  } catch (err) {
    request.log.error({ err }, 'Failed to verify Apple JWS');
    return reply.code(400).send({ error: 'Invalid signed transaction' });
  }

  // Validate transaction type is subscription
  if (transactionInfo.type !== 'Auto-Renewable Subscription') {
    return reply.code(400).send({ error: 'Transaction is not a subscription' });
  }

  // Validate environment matches
  const expectedEnv = authConfig.appleAppStore.environment;
  if (transactionInfo.environment !== expectedEnv) {
    request.log.warn(
      { expected: expectedEnv, received: transactionInfo.environment },
      'Environment mismatch'
    );
    return reply.code(400).send({ error: 'Environment mismatch' });
  }

  // Extract transaction data
  const {
    originalTransactionId,
    productId,
    subscriptionGroupIdentifier,
    expiresDate,
    appAccountToken,
  } = transactionInfo;

  const expiresAt = appleTimestampToDate(expiresDate);
  const now = new Date();

  // Check if subscription is expired
  if (expiresAt < now) {
    return reply.code(400).send({ error: 'Subscription is expired' });
  }

  // Verify appAccountToken matches current user
  const currentUser = await findUserById(request.user.id);
  if (!currentUser) {
    return reply.code(404).send({ error: 'User not found' });
  }

  if (appAccountToken && appAccountToken !== currentUser.app_account_token) {
    return reply.code(403).send({
      error: 'Transaction belongs to different account',
      reason: 'account_mismatch',
    });
  }

  // Check if subscription already exists
  let subscription = await findSubscriptionByTransactionId(originalTransactionId);

  if (subscription) {
    // Update existing subscription
    if (subscription.user_id && subscription.user_id !== currentUser.id) {
      return reply.code(409).send({
        error: 'Subscription belongs to different user',
        reason: 'subscription_conflict',
      });
    }

    subscription = await updateSubscription(originalTransactionId, {
      user_id: currentUser.id,
      is_orphaned: false,
      status: 'active',
      expires_at: expiresAt,
      last_renewal_at: now,
    });
  } else {
    // Create new subscription
    subscription = await createSubscription({
      userId: currentUser.id,
      isOrphaned: false,
      appAccountToken: appAccountToken || currentUser.app_account_token,
      originalTransactionId,
      environment: transactionInfo.environment,
      productId,
      subscriptionGroupId: subscriptionGroupIdentifier,
      status: 'active',
      autoRenewEnabled: true,
      expiresAt,
      lastRenewalAt: now,
    });
  }

  // Grant premium access
  const updatedUser = await updateUserTier({
    userId: currentUser.id,
    tier: 'premium',
    subscriptionValidUntil: expiresAt,
  });

  // Issue new tokens
  const tokens = generateTokens(updatedUser);
  await saveRefreshToken({
    userId: updatedUser.id,
    refreshToken: tokens.refreshToken,
    deviceInfo: getDeviceInfo(request),
    ipAddress: request.ip,
  });

  return {
    ...tokens,
    tier: 'premium',
    subscriptionValidUntil: expiresAt,
    subscription: {
      productId: subscription.product_id,
      expiresAt: subscription.expires_at,
      status: subscription.status,
    },
  };
}

export async function restore(request, reply) {
  const { signedTransaction, originalTransactionId } = request.body;

  if (!signedTransaction && !originalTransactionId) {
    return reply.code(400).send({
      error: 'Either signedTransaction or originalTransactionId is required',
    });
  }

  const currentUser = await findUserById(request.user.id);
  if (!currentUser) {
    return reply.code(404).send({ error: 'User not found' });
  }

  // Check if user is guest
  if (currentUser.is_guest) {
    return reply.code(403).send({
      error: 'Account required to restore purchases',
      reason: 'account_required',
    });
  }

  let transactionInfo;
  let txOriginalTransactionId = originalTransactionId;
  let expiresAt;
  let productId;
  let subscriptionGroupId;
  let environment;

  if (signedTransaction) {
    // Verify the signed transaction
    try {
      transactionInfo = await decodeSignedTransaction(signedTransaction);
    } catch (err) {
      request.log.error({ err }, 'Failed to verify Apple JWS for restore');
      return reply.code(400).send({ error: 'Invalid signed transaction' });
    }

    txOriginalTransactionId = transactionInfo.originalTransactionId;
    expiresAt = appleTimestampToDate(transactionInfo.expiresDate);
    productId = transactionInfo.productId;
    subscriptionGroupId = transactionInfo.subscriptionGroupIdentifier;
    environment = transactionInfo.environment;

    // Check if subscription is currently active
    const now = new Date();
    if (expiresAt < now) {
      return reply.code(400).send({ error: 'Subscription is expired' });
    }
  }

  // Check if subscription exists in our database
  let subscription = await findSubscriptionByTransactionId(txOriginalTransactionId);

  if (subscription) {
    // Subscription exists
    if (subscription.user_id && subscription.user_id !== currentUser.id) {
      // Belongs to different user
      return reply.code(409).send({
        error: 'Subscription belongs to different account',
        reason: 'subscription_conflict',
      });
    }

    if (subscription.is_orphaned) {
      // Link orphaned subscription to current user
      subscription = await linkSubscriptionToUser(txOriginalTransactionId, currentUser.id);
    }

    // Update subscription with latest info if we have it
    if (transactionInfo) {
      subscription = await updateSubscription(txOriginalTransactionId, {
        status: 'active',
        expires_at: expiresAt,
        last_renewal_at: new Date(),
      });
    }
  } else if (transactionInfo) {
    // Create new subscription record
    subscription = await createSubscription({
      userId: currentUser.id,
      isOrphaned: false,
      appAccountToken: transactionInfo.appAccountToken || currentUser.app_account_token,
      originalTransactionId: txOriginalTransactionId,
      environment,
      productId,
      subscriptionGroupId,
      status: 'active',
      autoRenewEnabled: true,
      expiresAt,
      lastRenewalAt: new Date(),
    });
  } else {
    // No signed transaction and subscription not in DB
    // Would need to call App Store Server API here
    // For now, return error
    return reply.code(404).send({
      error: 'Subscription not found. Please provide signedTransaction.',
    });
  }

  // Grant premium access
  const subscriptionExpiresAt = subscription.expires_at;
  const updatedUser = await updateUserTier({
    userId: currentUser.id,
    tier: 'premium',
    subscriptionValidUntil: subscriptionExpiresAt,
  });

  // Issue new tokens
  const tokens = generateTokens(updatedUser);
  await saveRefreshToken({
    userId: updatedUser.id,
    refreshToken: tokens.refreshToken,
    deviceInfo: getDeviceInfo(request),
    ipAddress: request.ip,
  });

  return {
    ...tokens,
    tier: 'premium',
    subscriptionValidUntil: subscriptionExpiresAt,
    subscription: {
      productId: subscription.product_id,
      expiresAt: subscription.expires_at,
      status: subscription.status,
    },
  };
}
