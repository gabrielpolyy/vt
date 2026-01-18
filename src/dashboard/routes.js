import { getStats, updateProgressHandler } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function dashboardRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/dashboard/stats - Get dashboard statistics
  fastify.get('/stats', {
    handler: getStats,
  });

  // PATCH /api/dashboard/progress - Update user progress (level and node)
  fastify.patch('/progress', {
    handler: updateProgressHandler,
  });
}
