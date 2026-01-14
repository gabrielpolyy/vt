import { requireAdmin } from '../auth/adminMiddleware.js';
import { getLogs, handleLogin, handleLogout } from './handlers.js';

export default async function logsRoutes(fastify) {
  // Admin check (but allows showing login form)
  fastify.addHook('preHandler', requireAdmin);

  // GET /logs - View logs (or login form if not authenticated)
  fastify.get('/', getLogs);

  // POST /logs/login - Handle login form submission
  fastify.post('/login', handleLogin);

  // POST /logs/logout - Clear cookie
  fastify.post('/logout', handleLogout);
}
