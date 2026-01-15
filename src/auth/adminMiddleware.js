import { db } from '../db.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function requireAdmin(request, reply) {
  // Try to authenticate from Authorization header or cookie
  const authHeader = request.headers.authorization;
  const cookieToken = request.cookies?.access_token;

  let token = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    // Return flag for handler to show login form
    request.needsLogin = true;
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      email: payload.email,
    };
  } catch {
    request.needsLogin = true;
    return;
  }

  // Check if user is admin
  const { rows } = await db.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [request.user.id]
  );

  if (!rows[0]?.is_admin) {
    // Clear invalid cookie and show login form
    reply.clearCookie('access_token', { path: '/logs' });
    request.needsLogin = true;
    request.loginError = 'Admin access required';
    return;
  }

  request.user.isAdmin = true;
}
