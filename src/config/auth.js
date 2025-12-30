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
};
