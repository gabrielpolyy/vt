import {
  updateUserName,
  findUserById,
  getAppleOAuthAccount,
  deleteUserAccount,
} from './repository.js';
import { revokeAllUserTokens } from '../auth/services.js';
import { revokeAppleSignIn } from '../auth/appleRevocation.js';
import { sendTelegramAlert, formatAccountDeletion } from '../logging/telegramNotifier.js';

export async function updateName(request, reply) {
  const { name } = request.body;
  const userId = request.user.id;

  if (!name) {
    return reply.code(400).send({ error: 'Name is required' });
  }

  const user = await updateUserName(userId, name);

  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function deleteAccount(request, reply) {
  const userId = request.user.id;
  const { appleAuthorizationCode } = request.body || {};
  const warnings = [];

  // Verify user exists
  const user = await findUserById(userId);
  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }

  // Check if user has Apple Sign-in linked
  const appleAccount = await getAppleOAuthAccount(userId);
  let appleRevoked = false;

  // Attempt Apple token revocation if applicable
  if (appleAccount) {
    if (appleAuthorizationCode) {
      const result = await revokeAppleSignIn(appleAuthorizationCode);
      if (result.success) {
        // Verify the authorization code belongs to this user's linked Apple account
        if (result.appleUserId !== appleAccount.provider_user_id) {
          return reply.code(403).send({
            error: 'Apple authorization code does not match your linked Apple account',
          });
        }
        appleRevoked = true;
      } else {
        warnings.push(
          `Apple Sign-in token revocation failed: ${result.error}. ` +
          'You may need to manually revoke access in Apple ID settings > Sign in with Apple.'
        );
      }
    } else {
      warnings.push(
        'No Apple authorization code provided. ' +
        'You may need to manually revoke access in Apple ID settings > Sign in with Apple.'
      );
    }
  }

  // Revoke all refresh tokens for this user
  await revokeAllUserTokens(userId);

  // Delete user account (CASCADE handles related data)
  const deleted = await deleteUserAccount(userId);
  if (!deleted) {
    return reply.code(500).send({ error: 'Failed to delete account' });
  }

  // Send Telegram notification for audit trail
  const message = formatAccountDeletion({
    userId,
    hadAppleAccount: !!appleAccount,
    appleRevoked,
  });
  sendTelegramAlert(message).catch(() => {
    // Non-blocking - don't fail deletion if notification fails
  });

  const response = {
    success: true,
    message: 'Account deleted successfully',
  };

  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  return response;
}
