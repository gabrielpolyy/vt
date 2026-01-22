import * as jose from 'jose';
import { X509Certificate, X509ChainBuilder } from '@peculiar/x509';
import crypto from 'crypto';

// Apple Root CA G3 certificate fingerprint (SHA-256)
// This is the root certificate that signs all Apple App Store certificates
const APPLE_ROOT_CA_G3_FINGERPRINT =
  '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';

// Cache for root certificate
let cachedRootCert = null;

async function getAppleRootCertificate() {
  if (cachedRootCert) {
    return cachedRootCert;
  }

  // Apple Root CA - G3 certificate (base64 encoded DER)
  // This is Apple's root certificate for App Store
  const appleRootCaG3 = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

  cachedRootCert = new X509Certificate(appleRootCaG3);
  return cachedRootCert;
}

function verifyRootCertFingerprint(cert) {
  const derBytes = cert.rawData;
  const fingerprint = crypto.createHash('sha256').update(Buffer.from(derBytes)).digest('hex');
  return fingerprint.toLowerCase() === APPLE_ROOT_CA_G3_FINGERPRINT.toLowerCase();
}

async function verifyCertificateChain(x5cChain) {
  if (!x5cChain || x5cChain.length === 0) {
    throw new Error('No certificate chain provided');
  }

  // Build X509Certificate objects from the chain
  const certs = x5cChain.map((certBase64) => {
    const certDer = Buffer.from(certBase64, 'base64');
    return new X509Certificate(certDer);
  });

  // Get Apple root certificate
  const rootCert = await getAppleRootCertificate();

  // Find the root in the chain or verify against known root
  const chainRoot = certs[certs.length - 1];

  // Verify the chain root matches Apple's root or is signed by it
  if (!verifyRootCertFingerprint(chainRoot)) {
    // The chain doesn't include the root, verify the last cert is signed by Apple root
    const chainBuilder = new X509ChainBuilder({
      certificates: [rootCert],
    });

    try {
      const chain = await chainBuilder.build(certs[0]);
      if (chain.length === 0) {
        throw new Error('Certificate chain validation failed');
      }
    } catch (err) {
      throw new Error(`Certificate chain validation failed: ${err.message}`);
    }
  }

  // Verify each certificate in the chain is signed by the next
  for (let i = 0; i < certs.length - 1; i++) {
    const cert = certs[i];
    const issuer = certs[i + 1];

    try {
      const isValid = await cert.verify({
        publicKey: issuer.publicKey,
      });
      if (!isValid) {
        throw new Error(`Certificate at index ${i} is not signed by certificate at index ${i + 1}`);
      }
    } catch (err) {
      throw new Error(`Certificate chain verification failed at index ${i}: ${err.message}`);
    }
  }

  // Verify leaf certificate is not expired
  const leafCert = certs[0];
  const now = new Date();
  if (leafCert.notBefore > now || leafCert.notAfter < now) {
    throw new Error('Leaf certificate is expired or not yet valid');
  }

  return leafCert;
}

export async function verifyAppleJWS(signedData) {
  // Decode the JWS header to get the certificate chain
  const parts = signedData.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format');
  }

  const headerBase64 = parts[0];
  const header = JSON.parse(Buffer.from(headerBase64, 'base64url').toString());

  if (!header.x5c || !Array.isArray(header.x5c)) {
    throw new Error('JWS header missing x5c certificate chain');
  }

  // Verify the certificate chain
  const leafCert = await verifyCertificateChain(header.x5c);

  // Extract the public key from the leaf certificate
  const publicKey = await jose.importX509(leafCert.toString(), header.alg || 'ES256');

  // Verify the JWS signature
  const { payload } = await jose.jwtVerify(signedData, publicKey, {
    algorithms: [header.alg || 'ES256'],
  });

  return payload;
}

export async function decodeAppleNotification(signedPayload) {
  // Verify the outer notification JWS
  const notification = await verifyAppleJWS(signedPayload);

  // The notification contains signed transaction and renewal info
  const result = {
    notificationType: notification.notificationType,
    subtype: notification.subtype,
    notificationUUID: notification.notificationUUID,
    data: notification.data,
    signedDate: notification.signedDate,
    transactionInfo: null,
    renewalInfo: null,
  };

  // Decode signed transaction info if present
  if (notification.data?.signedTransactionInfo) {
    result.transactionInfo = await verifyAppleJWS(notification.data.signedTransactionInfo);
  }

  // Decode signed renewal info if present
  if (notification.data?.signedRenewalInfo) {
    result.renewalInfo = await verifyAppleJWS(notification.data.signedRenewalInfo);
  }

  return result;
}

export async function decodeSignedTransaction(signedTransaction) {
  return await verifyAppleJWS(signedTransaction);
}
