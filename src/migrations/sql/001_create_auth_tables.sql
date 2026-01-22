-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    level INTEGER NOT NULL DEFAULT 1,
    node INTEGER NOT NULL DEFAULT 1,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    -- Subscription fields
    app_account_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    tier VARCHAR(10) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    subscription_valid_until TIMESTAMPTZ NULL,
    entitlement_version INT NOT NULL DEFAULT 1,
    -- Timestamps
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique: email unique only for non-guest accounts
CREATE UNIQUE INDEX idx_users_email_unique
ON users(email) WHERE email IS NOT NULL AND is_guest = FALSE;

-- OAuth providers (Apple, etc.)
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_guest_inactive ON users(last_active_at) WHERE is_guest = TRUE;
CREATE INDEX idx_users_app_account_token ON users(app_account_token);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider_lookup ON oauth_accounts(provider, provider_user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- User subscriptions (Apple In-App Purchases)
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    is_orphaned BOOLEAN NOT NULL DEFAULT FALSE,
    app_account_token UUID NULL,
    apple_original_transaction_id VARCHAR(255) NOT NULL UNIQUE,
    apple_environment VARCHAR(20) NOT NULL CHECK (apple_environment IN ('Sandbox', 'Production')),
    product_id VARCHAR(255) NOT NULL,
    subscription_group_id VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'grace_period', 'billing_retry', 'expired', 'revoked')),
    auto_renew_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_renewal_at TIMESTAMPTZ NULL,
    last_webhook_at TIMESTAMPTZ NULL,
    last_notification_uuid VARCHAR(255) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_original_transaction_id ON user_subscriptions(apple_original_transaction_id);
CREATE INDEX idx_user_subscriptions_app_account_token ON user_subscriptions(app_account_token);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status) WHERE status IN ('active', 'grace_period', 'billing_retry');

CREATE TRIGGER user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apple webhook log (for deduplication)
CREATE TABLE apple_webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_uuid VARCHAR(255) NOT NULL UNIQUE,
    notification_type VARCHAR(100) NOT NULL,
    subtype VARCHAR(100) NULL,
    original_transaction_id VARCHAR(255) NOT NULL,
    signed_date TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apple_webhook_log_notification_uuid ON apple_webhook_log(notification_uuid);
CREATE INDEX idx_apple_webhook_log_original_transaction_id ON apple_webhook_log(original_transaction_id);
CREATE INDEX idx_apple_webhook_log_processed_at ON apple_webhook_log(processed_at);
