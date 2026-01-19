import { requireAdmin } from '../auth/adminMiddleware.js';
import { getAdminHome, handleLogin, handleLogout, getHighwayForm, submitHighwayJob } from './handlers.js';
import { getLogs } from './logsHandlers.js';

export default async function adminRoutes(fastify) {
  fastify.addHook('preHandler', requireAdmin);

  // Admin home & auth
  fastify.get('/', getAdminHome);
  fastify.post('/login', handleLogin);
  fastify.post('/logout', handleLogout);

  // Highway generator
  fastify.get('/highway', getHighwayForm);
  fastify.post('/highway', submitHighwayJob);

  // Logs viewer
  fastify.get('/logs', getLogs);
}
