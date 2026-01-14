import { db } from '../db.js';
import { authenticate } from './middleware.js';

export async function requireAdmin(request, reply) {
  // First ensure user is authenticated
  await authenticate(request, reply);

  // If authenticate already sent a response, stop here
  if (reply.sent) return;

  // Check if user is admin
  const { rows } = await db.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [request.user.id]
  );

  if (!rows[0]?.is_admin) {
    return reply.code(403).send({ error: 'Admin access required' });
  }

  request.user.isAdmin = true;
}
