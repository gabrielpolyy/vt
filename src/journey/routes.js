import { getJourney } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function journeyRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/journey - Get complete journey/skill tree data
  fastify.get('/', {
    handler: getJourney,
  });
}
