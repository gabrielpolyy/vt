import {
  findUserByAppAccountToken,
  updateUserTier,
  incrementEntitlementVersion,
} from '../users/repository.js';
import {
  findSubscriptionByTransactionId,
  createSubscription,
  updateSubscription,
  findWebhookLog,
  createWebhookLog,
} from './repository.js';
import { decodeAppleNotification } from './apple-jws.js';

// Convert Apple milliseconds timestamp to Date
function appleTimestampToDate(ms) {
  return new Date(ms);
}

// Notification types that grant premium (bump entV)
const GRANT_PREMIUM_TYPES = ['SUBSCRIBED', 'OFFER_REDEEMED'];

// Notification types that revoke premium (bump entV)
const REVOKE_TYPES = ['GRACE_PERIOD_EXPIRED', 'EXPIRED', 'REFUND', 'REVOKE'];

// Notification types that don't change access
const NO_CHANGE_TYPES = ['DID_RENEW', 'DID_FAIL_TO_RENEW', 'DID_CHANGE_RENEWAL_STATUS', 'RENEWAL_EXTENDED'];

function getStatusFromNotification(notificationType, subtype, transactionInfo) {
  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'OFFER_REDEEMED':
    case 'DID_RENEW':
    case 'RENEWAL_EXTENDED':
      return 'active';

    case 'DID_FAIL_TO_RENEW':
      return 'billing_retry';

    case 'GRACE_PERIOD_EXPIRED':
    case 'EXPIRED':
      return 'expired';

    case 'REFUND':
    case 'REVOKE':
      return 'revoked';

    default:
      // Check transaction info for current status if available
      if (transactionInfo?.revocationDate) {
        return 'revoked';
      }
      return 'active';
  }
}

export async function handleAppleWebhook(request, reply) {
  const { signedPayload } = request.body;

  if (!signedPayload) {
    return reply.code(400).send({ error: 'Missing signedPayload' });
  }

  let notification;
  try {
    notification = await decodeAppleNotification(signedPayload);
  } catch (err) {
    request.log.error({ err }, 'Failed to verify Apple webhook JWS');
    return reply.code(400).send({ error: 'Invalid webhook signature' });
  }

  const {
    notificationType,
    subtype,
    notificationUUID,
    signedDate,
    transactionInfo,
    renewalInfo,
  } = notification;

  // Check for duplicate webhook
  const existingLog = await findWebhookLog(notificationUUID);
  if (existingLog) {
    request.log.info({ notificationUUID }, 'Duplicate webhook, skipping');
    return { success: true, duplicate: true };
  }

  if (!transactionInfo) {
    request.log.warn({ notificationType }, 'Webhook missing transaction info');
    // Log it anyway to prevent reprocessing
    await createWebhookLog({
      notificationUuid: notificationUUID,
      notificationType,
      subtype,
      originalTransactionId: 'unknown',
      signedDate: appleTimestampToDate(signedDate),
    });
    return { success: true };
  }

  const {
    originalTransactionId,
    productId,
    subscriptionGroupIdentifier,
    expiresDate,
    appAccountToken,
    environment,
  } = transactionInfo;

  const expiresAt = appleTimestampToDate(expiresDate);
  const status = getStatusFromNotification(notificationType, subtype, transactionInfo);

  // Find or create subscription record
  let subscription = await findSubscriptionByTransactionId(originalTransactionId);
  let user = null;

  // Try to find user by appAccountToken
  if (appAccountToken) {
    user = await findUserByAppAccountToken(appAccountToken);
  }

  if (subscription) {
    // Update existing subscription
    const updates = {
      status,
      expires_at: expiresAt,
      last_webhook_at: new Date(),
      last_notification_uuid: notificationUUID,
    };

    if (renewalInfo) {
      updates.auto_renew_enabled = renewalInfo.autoRenewStatus === 1;
    }

    if (notificationType === 'DID_RENEW') {
      updates.last_renewal_at = new Date();
    }

    // Link to user if we found one and subscription is orphaned
    if (user && subscription.is_orphaned) {
      updates.user_id = user.id;
      updates.is_orphaned = false;
    }

    subscription = await updateSubscription(originalTransactionId, updates);
  } else {
    // Create new subscription
    subscription = await createSubscription({
      userId: user?.id || null,
      isOrphaned: !user,
      appAccountToken: appAccountToken || null,
      originalTransactionId,
      environment,
      productId,
      subscriptionGroupId: subscriptionGroupIdentifier,
      status,
      autoRenewEnabled: renewalInfo?.autoRenewStatus === 1 ?? true,
      expiresAt,
      lastRenewalAt: notificationType === 'DID_RENEW' ? new Date() : null,
    });
  }

  // Update user tier if we have a user
  const userId = subscription.user_id;
  if (userId) {
    if (GRANT_PREMIUM_TYPES.includes(notificationType)) {
      // Grant premium
      await updateUserTier({
        userId,
        tier: 'premium',
        subscriptionValidUntil: expiresAt,
      });
      request.log.info({ userId, notificationType }, 'Granted premium via webhook');
    } else if (REVOKE_TYPES.includes(notificationType)) {
      // Revoke premium
      await updateUserTier({
        userId,
        tier: 'free',
        subscriptionValidUntil: null,
      });
      request.log.info({ userId, notificationType }, 'Revoked premium via webhook');
    } else if (notificationType === 'DID_RENEW' || notificationType === 'RENEWAL_EXTENDED') {
      // Update subscription expiration without bumping entV
      // Only update subscription_valid_until, not tier change
      const { db } = await import('../db.js');
      await db.query(
        `UPDATE users SET subscription_valid_until = $2, updated_at = NOW() WHERE id = $1`,
        [userId, expiresAt]
      );
      request.log.info({ userId, notificationType, expiresAt }, 'Updated subscription expiration');
    }
    // For DID_FAIL_TO_RENEW and DID_CHANGE_RENEWAL_STATUS, we don't change user tier
  }

  // Log the webhook
  await createWebhookLog({
    notificationUuid: notificationUUID,
    notificationType,
    subtype,
    originalTransactionId,
    signedDate: appleTimestampToDate(signedDate),
  });

  request.log.info(
    { notificationType, subtype, originalTransactionId, status },
    'Processed Apple webhook'
  );

  // Always return 200 to Apple
  return { success: true };
}
