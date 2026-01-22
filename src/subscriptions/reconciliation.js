import * as jose from 'jose';
import { authConfig } from '../config/auth.js';
import { updateUserTier } from '../users/repository.js';
import {
  getSubscriptionsForReconciliation,
  updateSubscription,
  pruneOldWebhookLogs,
} from './repository.js';
import { decodeSignedTransaction } from './apple-jws.js';

// Generate App Store Server API JWT
async function generateAppStoreServerToken() {
  const { issuerId, keyId, privateKey, bundleId } = authConfig.appleAppStore;

  if (!issuerId || !keyId || !privateKey) {
    throw new Error('Apple App Store credentials not configured');
  }

  // Handle escaped newlines from .env file
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const key = await jose.importPKCS8(formattedKey, 'ES256');

  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt()
    .setExpirationTime('20m')
    .setSubject(bundleId)
    .sign(key);

  return token;
}

// Get subscription status from App Store Server API
async function getSubscriptionStatus(originalTransactionId, environment) {
  const token = await generateAppStoreServerToken();

  const baseUrl =
    environment === 'Production'
      ? 'https://api.storekit.itunes.apple.com'
      : 'https://api.storekit-sandbox.itunes.apple.com';

  const response = await fetch(
    `${baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null; // Subscription not found
    }
    throw new Error(`App Store API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Parse subscription status from App Store response
function parseSubscriptionStatus(subscriptionData) {
  if (!subscriptionData?.data?.[0]) {
    return null;
  }

  const subscriptionGroup = subscriptionData.data[0];
  const lastTransaction = subscriptionGroup.lastTransactions?.[0];

  if (!lastTransaction) {
    return null;
  }

  return {
    status: lastTransaction.status,
    signedTransactionInfo: lastTransaction.signedTransactionInfo,
    signedRenewalInfo: lastTransaction.signedRenewalInfo,
  };
}

// Map App Store status to our status
function mapAppleStatus(appleStatus) {
  // Apple status codes:
  // 1 = active, 2 = expired, 3 = billing_retry, 4 = grace_period, 5 = revoked
  switch (appleStatus) {
    case 1:
      return 'active';
    case 2:
      return 'expired';
    case 3:
      return 'billing_retry';
    case 4:
      return 'grace_period';
    case 5:
      return 'revoked';
    default:
      return 'expired';
  }
}

export async function runReconciliation(logger) {
  const log = logger || console;
  log.info('Starting subscription reconciliation');

  const subscriptions = await getSubscriptionsForReconciliation();
  log.info({ count: subscriptions.length }, 'Fetched subscriptions for reconciliation');

  let synced = 0;
  let errors = 0;
  let driftDetected = 0;

  for (const subscription of subscriptions) {
    try {
      const appleData = await getSubscriptionStatus(
        subscription.apple_original_transaction_id,
        subscription.apple_environment
      );

      if (!appleData) {
        log.warn(
          { originalTransactionId: subscription.apple_original_transaction_id },
          'Subscription not found in Apple'
        );
        continue;
      }

      const parsed = parseSubscriptionStatus(appleData);
      if (!parsed) {
        log.warn(
          { originalTransactionId: subscription.apple_original_transaction_id },
          'Could not parse Apple subscription data'
        );
        continue;
      }

      const appleStatus = mapAppleStatus(parsed.status);
      let expiresAt = subscription.expires_at;

      // Decode transaction info to get latest expiration
      if (parsed.signedTransactionInfo) {
        try {
          const txInfo = await decodeSignedTransaction(parsed.signedTransactionInfo);
          if (txInfo.expiresDate) {
            expiresAt = new Date(txInfo.expiresDate);
          }
        } catch (err) {
          log.error({ err }, 'Failed to decode transaction info during reconciliation');
        }
      }

      // Check for drift
      const hasStatusDrift = subscription.status !== appleStatus;
      const hasExpirationDrift =
        Math.abs(new Date(subscription.expires_at).getTime() - expiresAt.getTime()) > 60000; // 1 minute tolerance

      if (hasStatusDrift || hasExpirationDrift) {
        driftDetected++;
        log.info(
          {
            originalTransactionId: subscription.apple_original_transaction_id,
            dbStatus: subscription.status,
            appleStatus,
            dbExpires: subscription.expires_at,
            appleExpires: expiresAt,
          },
          'Drift detected, updating subscription'
        );

        // Update subscription
        await updateSubscription(subscription.apple_original_transaction_id, {
          status: appleStatus,
          expires_at: expiresAt,
        });

        // Update user tier if needed
        if (subscription.user_id) {
          const isNowActive = ['active', 'grace_period', 'billing_retry'].includes(appleStatus);
          const wasActive = ['active', 'grace_period', 'billing_retry'].includes(subscription.status);

          if (isNowActive && !wasActive) {
            // Reactivate premium
            await updateUserTier({
              userId: subscription.user_id,
              tier: 'premium',
              subscriptionValidUntil: expiresAt,
            });
            log.info({ userId: subscription.user_id }, 'Reactivated premium via reconciliation');
          } else if (!isNowActive && wasActive) {
            // Revoke premium
            await updateUserTier({
              userId: subscription.user_id,
              tier: 'free',
              subscriptionValidUntil: null,
            });
            log.info({ userId: subscription.user_id }, 'Revoked premium via reconciliation');
          } else if (isNowActive) {
            // Just update expiration
            const { db } = await import('../db.js');
            await db.query(
              `UPDATE users SET subscription_valid_until = $2, updated_at = NOW() WHERE id = $1`,
              [subscription.user_id, expiresAt]
            );
          }
        }
      }

      synced++;
    } catch (err) {
      errors++;
      log.error(
        {
          err,
          originalTransactionId: subscription.apple_original_transaction_id,
        },
        'Error reconciling subscription'
      );
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Prune old webhook logs
  const pruned = await pruneOldWebhookLogs(90);
  log.info({ pruned }, 'Pruned old webhook logs');

  log.info(
    { synced, errors, driftDetected, pruned },
    'Subscription reconciliation complete'
  );

  return { synced, errors, driftDetected, pruned };
}
