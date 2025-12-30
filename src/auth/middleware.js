import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      email: payload.email,
    };
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}
