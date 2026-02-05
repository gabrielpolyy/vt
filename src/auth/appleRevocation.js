import { createPrivateKey } from 'crypto';
import { SignJWT } from 'jose';
import { authConfig } from '../config/auth.js';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

/**
 * Generate a client secret JWT for Apple Sign In API.
 * Apple requires ES256-signed JWTs as client secrets instead of static secrets.
 * The JWT is signed with our App Store Connect private key.
 */
export async function generateAppleClientSecret() {
  const { clientId, teamId } = authConfig.apple;
  const { keyId, privateKey } = authConfig.appleAppStore;

  if (!privateKey || !keyId || !teamId || !clientId) {
    throw new Error('Apple Sign In configuration incomplete');
  }

  // Parse the private key (PEM format)
  // Normalize escaped newlines from environment variables
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const ecPrivateKey = createPrivateKey(formattedKey);

  const now = Math.floor(Date.now() / 1000);

  // Create JWT with required Apple claims
  const clientSecret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 15552000) // 180 days (safe margin under Apple's 6-month max)
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(ecPrivateKey);

  return clientSecret;
}

/**
 * Exchange an Apple authorization code for tokens.
 * This is needed because we don't store Apple's refresh_token during sign-in.
 * To revoke access, we need to get a fresh refresh_token from Apple.
 *
 * @param {string} authorizationCode - Fresh code from Sign in with Apple
 * @returns {Promise<{refreshToken: string, accessToken: string}>}
 */
export async function exchangeAppleCodeForTokens(authorizationCode) {
  const clientSecret = await generateAppleClientSecret();
  const { clientId } = authConfig.apple;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: 'authorization_code',
  });

  const response = await fetch(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple token exchange failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
  };
}

/**
 * Decode an Apple id_token to extract the user's Apple ID (sub claim).
 * Note: This performs basic JWT parsing without signature verification since
 * we already trust the token from Apple's token endpoint.
 *
 * @param {string} idToken - The id_token from Apple
 * @returns {string} The Apple user ID (sub claim)
 */
export function decodeAppleIdToken(idToken) {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid id_token format');
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  if (!payload.sub) {
    throw new Error('id_token missing sub claim');
  }
  return payload.sub;
}

/**
 * Revoke an Apple token (access_token or refresh_token).
 * Per Apple's guidelines, revoking the refresh_token invalidates both tokens.
 *
 * @param {string} token - The token to revoke
 * @param {'access_token' | 'refresh_token'} tokenTypeHint - Type of token
 */
export async function revokeAppleToken(token, tokenTypeHint = 'refresh_token') {
  const clientSecret = await generateAppleClientSecret();
  const { clientId } = authConfig.apple;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token: token,
    token_type_hint: tokenTypeHint,
  });

  const response = await fetch(APPLE_REVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  // Apple returns 200 even if token was already revoked
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple token revocation failed: ${response.status} - ${errorText}`);
  }

  return true;
}

/**
 * Full Apple Sign In revocation flow:
 * 1. Exchange fresh authorization code for tokens
 * 2. Revoke the refresh token
 *
 * @param {string} authorizationCode - Fresh code from Sign in with Apple prompt
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function revokeAppleSignIn(authorizationCode) {
  try {
    // Exchange the authorization code for tokens
    const { refreshToken, idToken } = await exchangeAppleCodeForTokens(authorizationCode);

    // Extract Apple user ID from id_token for verification
    const appleUserId = decodeAppleIdToken(idToken);

    // Revoke the refresh token (this invalidates the access token too)
    await revokeAppleToken(refreshToken, 'refresh_token');

    return { success: true, appleUserId };
  } catch (error) {
    console.error('Apple Sign In revocation failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
