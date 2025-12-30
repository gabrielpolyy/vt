import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { authConfig } from '../config/auth.js';

const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

function getApplePublicKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const publicKey = key.getPublicKey();
    callback(null, publicKey);
  });
}

export function verifyAppleToken(identityToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getApplePublicKey,
      {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: authConfig.apple.clientId,
      },
      (err, payload) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(payload);
      }
    );
  });
}
