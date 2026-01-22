# PitchHighway Subscription & Entitlement Spec (Final)

---

## 1. Database Schema

```sql
users
├── id: UUID (PK)
├── app_account_token: UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE
├── user_type: enum('guest', 'registered') NOT NULL DEFAULT 'guest'
├── tier: enum('free', 'premium') NOT NULL DEFAULT 'free'
├── subscription_valid_until: timestamp NULL
├── entitlement_version: int NOT NULL DEFAULT 1
├── created_at: timestamp NOT NULL DEFAULT now()
├── updated_at: timestamp NOT NULL DEFAULT now()
├── INDEX(app_account_token)
```

```sql
user_subscriptions
├── id: UUID (PK)
├── user_id: UUID NULL (FK → users.id)
├── is_orphaned: boolean NOT NULL DEFAULT false
├── app_account_token: UUID NULL
├── apple_original_transaction_id: varchar NOT NULL UNIQUE
├── apple_environment: enum('sandbox', 'production') NOT NULL
├── product_id: varchar NOT NULL
├── subscription_group_id: varchar NULL
├── status: enum('active', 'grace_period', 'billing_retry', 'expired', 'revoked') NOT NULL
├── auto_renew_enabled: boolean NOT NULL DEFAULT true
├── expires_at: timestamp NOT NULL
├── last_renewal_at: timestamp NULL
├── last_webhook_at: timestamp NULL
├── last_notification_uuid: varchar NULL
├── created_at: timestamp NOT NULL DEFAULT now()
├── updated_at: timestamp NOT NULL DEFAULT now()
├── INDEX(user_id)
├── INDEX(apple_original_transaction_id)
├── INDEX(app_account_token)
```

```sql
apple_webhook_log
├── id: UUID (PK)
├── notification_uuid: varchar NOT NULL UNIQUE
├── notification_type: varchar NOT NULL
├── subtype: varchar NULL
├── original_transaction_id: varchar NOT NULL
├── signed_date: timestamp NOT NULL
├── processed_at: timestamp NOT NULL DEFAULT now()
├── INDEX(notification_uuid)
├── INDEX(original_transaction_id)
├── INDEX(processed_at)
```

---

## 2. Key Concepts

### User Type vs Tier

| Field | Purpose | Values |
|-------|---------|--------|
| `user_type` | Account status | `guest`, `registered` |
| `tier` | Subscription status | `free`, `premium` |

These are separate concerns. A registered user can be free or premium. A guest is always free.

### App Account Token

- Dedicated UUID for Apple subscription mapping
- Separate from `user_id` to allow future account merges/migrations
- Set on user creation, never changes
- iOS client passes this to StoreKit at purchase time
- Apple returns it in all transactions and webhooks

### Entitlement Version

- Integer that increments on any entitlement change
- Stored in JWT and in database
- Allows detection of mid-token revocations without DB lookup on every request
- Cache in Redis for fast comparison

---

## 3. JWT Structure

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | UUID | User identifier |
| `userType` | string | `guest` or `registered` |
| `tier` | string | `free` or `premium` |
| `subValidUntil` | int | Unix timestamp (seconds) when subscription expires |
| `entV` | int | Entitlement version |
| `iat` | int | Token issued at (seconds) |
| `exp` | int | Token expiry (seconds) |

### Token Lifetimes

| Token | TTL | Storage |
|-------|-----|---------|
| Access token | 15-30 minutes | Memory |
| Refresh token | 30-90 days | iOS Keychain |

---

## 4. Timestamp Convention

| Source | Format |
|--------|--------|
| Database | Proper `timestamp` type |
| JWT | Seconds (Unix epoch) |
| Apple | Milliseconds — convert at boundaries |

Always convert explicitly. Never assume.

---

## 5. Content Access Levels

| access_level | Guest | Registered Free | Premium |
|--------------|-------|-----------------|---------|
| `guest` | ✅ | ✅ | ✅ |
| `registered` | ❌ | ✅ | ✅ |
| `premium` | ❌ | ❌ | ✅ |

Each exercise, song, and lesson has an `access_level` field. Optionally mark expensive operations with `is_costly` flag.

---

## 6. Server-Side Access Check

**Runs on API server. Client checks are UX only.**

### Logic Flow

1. If endpoint requires `registered` and user is `guest` → deny
2. If endpoint requires `premium` and user tier is not `premium` → deny
3. If token's `subValidUntil` has passed → require refresh
4. If token older than 15 minutes OR endpoint is costly → verify `entV` against cache/DB
5. If `entV` mismatch → require refresh
6. Otherwise → allow

### Response Codes

| Code | Reason | Client Action |
|------|--------|---------------|
| `403` | `account_required` | Show account creation prompt |
| `403` | `premium_required` | Show subscription prompt |
| `409` | `refresh_required` | Refresh token, retry request |

---

## 7. Entitlement Version Management

### When to Bump

| Event | Bump `entV`? | Change `tier`? |
|-------|--------------|----------------|
| User subscribes | ✅ | → `premium` |
| Subscription expires | ✅ | → `free` |
| Refund | ✅ | → `free` |
| Revoke | ✅ | → `free` |
| Grace period expired | ✅ | → `free` |
| Normal renewal | ❌ | — |
| Billing retry started | ❌ | — |
| Grace period started | ❌ | — |

### Cache Invalidation

When granting or revoking premium, always delete the `entV:{userId}` cache key.

---

## 8. JWS Verification

**Every JWS from Apple must have full certificate chain validation.**

### Steps

1. Decode header to get `x5c` certificate chain
2. Build certificate objects from chain
3. Verify root certificate matches Apple Root CA G3 fingerprint
4. Verify each certificate is signed by the next in chain
5. Verify leaf certificate is not expired
6. Verify JWS signature using leaf certificate's public key
7. Return decoded payload

**Never trust JWS without full chain validation.**

---

## 9. Purchase Flow

### Steps

1. iOS client retrieves `user.app_account_token`
2. iOS client sets `appAccountToken` in StoreKit purchase options
3. StoreKit handles purchase with Apple
4. iOS client receives `Transaction` with `jwsRepresentation`
5. iOS client calls `POST /subscriptions/verify` with signed transaction data
6. Server verifies JWS with full cert-chain validation
7. Server validates transaction type, environment, expiration
8. Server verifies `appAccountToken` matches authenticated user's `app_account_token`
9. Server upserts `user_subscriptions` record
10. Server grants premium: `tier = premium`, `entV++`, set `subscription_valid_until`
11. Server issues new JWT
12. iOS client stores new tokens

---

## 10. Verify Endpoint

`POST /subscriptions/verify`

### Input

Signed transaction data (JWS from StoreKit 2)

### Server Actions

1. Verify JWS with full cert-chain validation
2. Validate transaction type is subscription
3. Validate environment matches (sandbox/production)
4. Extract `originalTransactionId`, `productId`, `expiresDate`, `appAccountToken`
5. Convert `expiresDate` from milliseconds to datetime
6. Verify `appAccountToken` matches current user's `app_account_token`
7. Check subscription is not already expired
8. Upsert subscription record linked to user
9. Grant premium access
10. Issue new tokens

### Output

New access token, refresh token, tier, expiration date

---

## 11. Restore Endpoint

`POST /subscriptions/restore`

### Input

Either signed transaction data (JWS) or `originalTransactionId`

### Server Actions

1. If JWS provided → verify directly
2. If only transaction ID → call App Store Server API
3. Verify subscription is currently active
4. Check if subscription exists in DB:
   - Exists, linked to different user → reject (409)
   - Exists, orphaned → link to current user
   - Not exists → create new record
5. Grant premium access
6. Issue new tokens

### Purpose

Restore purchases on new device or after reinstall.

---

## 12. Webhook Endpoint

`POST /webhooks/apple-subscriptions`

### Input

Signed payload (JWS from Apple)

### Server Actions

1. Verify JWS with full cert-chain validation
2. Extract `notificationUUID`, `notificationType`, `subtype`, `signedDate`
3. Dedupe: if `notificationUUID` already in `apple_webhook_log` → return 200, skip
4. Decode nested `signedTransactionInfo` and `signedRenewalInfo` (also JWS)
5. Extract `originalTransactionId`, `appAccountToken`, `expiresDate`
6. Find or create subscription record:
   - If `appAccountToken` present → look up user by `app_account_token`, link
   - If no `appAccountToken` → create as orphaned
7. Update subscription based on notification type
8. Save subscription
9. Insert into `apple_webhook_log`
10. Return 200

**Always return 200 to Apple after processing.**

---

## 13. Webhook → User Mapping

### Problem

Webhooks don't directly identify users.

### Solution

1. iOS client sets `appAccountToken = user.app_account_token` at purchase
2. Apple persists and returns it in all transactions and webhooks
3. Server looks up user by `app_account_token` column

### Orphaned Subscriptions

If `appAccountToken` is missing:
- Create subscription with `user_id = NULL`, `is_orphaned = true`
- When user does Restore, link subscription to them

---

## 14. Webhook Deduplication

### Why

Apple may retry webhooks. Same transaction appears in multiple notification types.

### How

- Use `notificationUUID` (unique per webhook delivery)
- Check against `apple_webhook_log` before processing
- Skip if already seen
- Prune logs older than 90 days

---

## 15. Notification Type Handling

### Do NOT Revoke (User Still Entitled)

| Type | Status | Action |
|------|--------|--------|
| `DID_RENEW` | `active` | Update `expires_at`, `last_renewal_at`. No entV bump. |
| `DID_FAIL_TO_RENEW` | `billing_retry` | User still entitled. Apple retrying. |
| `DID_CHANGE_RENEWAL_STATUS` | — | Update `auto_renew_enabled`. No access change. |
| `RENEWAL_EXTENDED` | `active` | Update `expires_at`. Apple extended via support. |

### Revoke Premium (Bump entV)

| Type | Subtype | Status |
|------|---------|--------|
| `GRACE_PERIOD_EXPIRED` | — | `expired` |
| `EXPIRED` | `VOLUNTARY` | `expired` |
| `EXPIRED` | `BILLING_RETRY` | `expired` |
| `EXPIRED` | `PRICE_INCREASE` | `expired` |
| `REFUND` | — | `revoked` |
| `REVOKE` | — | `revoked` |

### Grant Premium (Bump entV)

| Type | Status |
|------|--------|
| `SUBSCRIBED` | `active` |
| `OFFER_REDEEMED` | `active` |

---

## 16. Reconciliation Job

### Purpose

Catch missed webhooks, network issues, drift.

### Frequency

Daily

### Process

1. Query subscriptions with status `active`, `grace_period`, or `billing_retry`
2. For each, call App Store Server API for current status
3. Compare Apple's truth with your DB
4. If Apple says expired but DB says active → revoke, bump entV
5. If Apple says active but DB says expired → grant, bump entV
6. Update `expires_at` from Apple
7. Log drift for monitoring

---

## 17. Client-Side Handling

### Access Check (UX Only)

When user taps content:
1. Check local user tier
2. If requires account and user is guest → show account creation sheet
3. If requires premium and user is free → show subscription sheet
4. If allowed → proceed (server validates)

### Subscription Prompt

Bottom sheet with:
- Title: "Upgrade to Premium"
- Benefits list
- Pricing options (monthly/yearly)
- Subscribe button
- Restore Purchase link
- "Maybe later" dismiss

### Handling 409

When API returns `409 refresh_required`:
1. Call token refresh endpoint
2. Retry original request
3. If still fails → show appropriate prompt

---

## 18. Edge Cases

| Scenario | Handling |
|----------|----------|
| Guest tries to subscribe | Prompt to create account first |
| Token says premium but `entV` mismatch | Return 409, client refreshes |
| Token says premium but `subValidUntil` passed | Return 409, client refreshes |
| `DID_FAIL_TO_RENEW` received | Set `billing_retry`, do NOT revoke |
| `GRACE_PERIOD_EXPIRED` received | Now revoke |
| Refund mid-period | Revoke immediately |
| Restore on new device | Verify, link subscription, grant premium |
| Subscription not in DB | Restore creates record |
| Duplicate webhook | Check `notificationUUID`, skip if seen |
| Webhook without `appAccountToken` | Store orphaned, link on restore |
| `appAccountToken` mismatch on verify | Reject (403) |
| Subscription belongs to different user on restore | Reject (409) |

---

## 19. Summary

```
FAST PATH
├── JWT has tier=premium
├── subValidUntil not passed
├── entV not checked (fresh token) or matches cache
└── Allow immediately — no DB hit

VERIFY PATH
├── Token > 15 minutes OR costly endpoint
├── Check entV against cache/DB
├── Mismatch → 409 refresh_required
└── Match → Allow

SOURCE OF TRUTH
├── Apple S2S webhooks keep DB updated real-time
├── App Store Server API for verify/restore
├── Daily reconciliation catches drift
└── Token refresh pulls fresh state
```

---

## 20. Checklist

| Item | ✓ |
|------|---|
| Separate `user_type` from `tier` | ✅ |
| Dedicated `app_account_token` (not reusing userId) | ✅ |
| `entitlement_version` for mid-token revocations | ✅ |
| StoreKit 2 / App Store Server API | ✅ |
| Server-side access checks | ✅ |
| Full JWS cert-chain validation | ✅ |
| Secure webhook→user mapping via `app_account_token` | ✅ |
| Orphaned subscriptions for missing token | ✅ |
| Dedupe webhooks via `notificationUUID` | ✅ |
| Consistent timestamp handling | ✅ |
| Don't revoke on `DID_FAIL_TO_RENEW` | ✅ |
| Revoke on definitive end states | ✅ |
| Daily reconciliation job | ✅ |
| Restore purchases endpoint | ✅ |
| Use 403 with reason codes (not 402) | ✅ |