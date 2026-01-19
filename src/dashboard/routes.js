import { getStats, updateProgressHandler, recordActivityHandler } from './handlers.js';
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

// Activity routes (registered separately at /api/activity)
export async function activityRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/activity/ping - Record daily activity for streak (without recording attempt)
  fastify.post('/ping', {
    handler: recordActivityHandler,
  });
}
