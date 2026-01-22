import { db } from '../db.js';

// Subscription record management
export async function findSubscriptionByTransactionId(originalTransactionId) {
  const { rows } = await db.query(
    `SELECT * FROM user_subscriptions WHERE apple_original_transaction_id = $1`,
    [originalTransactionId]
  );
  return rows[0] || null;
}

export async function findSubscriptionByAppAccountToken(appAccountToken) {
  const { rows } = await db.query(
    `SELECT * FROM user_subscriptions WHERE app_account_token = $1 ORDER BY created_at DESC LIMIT 1`,
    [appAccountToken]
  );
  return rows[0] || null;
}

export async function findActiveSubscriptionsByUserId(userId) {
  const { rows } = await db.query(
    `SELECT * FROM user_subscriptions
     WHERE user_id = $1 AND status IN ('active', 'grace_period', 'billing_retry')
     ORDER BY expires_at DESC`,
    [userId]
  );
  return rows;
}

export async function createSubscription({
  userId,
  isOrphaned,
  appAccountToken,
  originalTransactionId,
  environment,
  productId,
  subscriptionGroupId,
  status,
  autoRenewEnabled,
  expiresAt,
  lastRenewalAt,
}) {
  const { rows } = await db.query(
    `INSERT INTO user_subscriptions (
      user_id, is_orphaned, app_account_token, apple_original_transaction_id,
      apple_environment, product_id, subscription_group_id, status,
      auto_renew_enabled, expires_at, last_renewal_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      userId,
      isOrphaned,
      appAccountToken,
      originalTransactionId,
      environment,
      productId,
      subscriptionGroupId,
      status,
      autoRenewEnabled,
      expiresAt,
      lastRenewalAt,
    ]
  );
  return rows[0];
}

export async function updateSubscription(originalTransactionId, updates) {
  const setClause = [];
  const values = [originalTransactionId];
  let paramIndex = 2;

  const allowedFields = [
    'user_id',
    'is_orphaned',
    'status',
    'auto_renew_enabled',
    'expires_at',
    'last_renewal_at',
    'last_webhook_at',
    'last_notification_uuid',
  ];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClause.length === 0) {
    return null;
  }

  const { rows } = await db.query(
    `UPDATE user_subscriptions
     SET ${setClause.join(', ')}, updated_at = NOW()
     WHERE apple_original_transaction_id = $1
     RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function linkSubscriptionToUser(originalTransactionId, userId) {
  const { rows } = await db.query(
    `UPDATE user_subscriptions
     SET user_id = $2, is_orphaned = FALSE, updated_at = NOW()
     WHERE apple_original_transaction_id = $1
     RETURNING *`,
    [originalTransactionId, userId]
  );
  return rows[0] || null;
}

// Webhook log management
export async function findWebhookLog(notificationUuid) {
  const { rows } = await db.query(
    `SELECT * FROM apple_webhook_log WHERE notification_uuid = $1`,
    [notificationUuid]
  );
  return rows[0] || null;
}

export async function createWebhookLog({
  notificationUuid,
  notificationType,
  subtype,
  originalTransactionId,
  signedDate,
}) {
  const { rows } = await db.query(
    `INSERT INTO apple_webhook_log (
      notification_uuid, notification_type, subtype, original_transaction_id, signed_date
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [notificationUuid, notificationType, subtype, originalTransactionId, signedDate]
  );
  return rows[0];
}

export async function pruneOldWebhookLogs(daysOld = 90) {
  const { rowCount } = await db.query(
    `DELETE FROM apple_webhook_log WHERE processed_at < NOW() - INTERVAL '1 day' * $1`,
    [daysOld]
  );
  return rowCount;
}

// For reconciliation: get all active/grace/retry subscriptions
export async function getSubscriptionsForReconciliation() {
  const { rows } = await db.query(
    `SELECT us.*, u.app_account_token as user_app_account_token
     FROM user_subscriptions us
     LEFT JOIN users u ON u.id = us.user_id
     WHERE us.status IN ('active', 'grace_period', 'billing_retry')
     ORDER BY us.expires_at ASC`
  );
  return rows;
}
