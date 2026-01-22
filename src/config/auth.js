export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiry: '15m',
    algorithm: 'HS256',
  },
  refreshToken: {
    expiryDays: 7,
    byteLength: 32,
  },
  password: {
    minLength: 8,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
  },
  appleAppStore: {
    bundleId: process.env.APPLE_BUNDLE_ID,
    issuerId: process.env.APPLE_ISSUER_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
    environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox',
  },
};
