import { getJourney, getSkillTree, listJourneys, getJourneyById, getSkillTreeById, updateJourneyProgress } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function journeyRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Static routes first (before parameterized)

  // GET /api/journey/list - List all active journeys with user progress
  fastify.get('/list', {
    handler: listJourneys,
  });

  // GET /api/journey - Get complete journey/skill tree data (legacy)
  fastify.get('/', {
    handler: getJourney,
  });

  // GET /api/journey/skill-tree - Get skill tree definition (legacy)
  fastify.get('/skill-tree', {
    handler: getSkillTree,
  });

  // Parameterized routes

  // GET /api/journey/:journeyId - Get journey data by ID
  fastify.get('/:journeyId', {
    handler: getJourneyById,
  });

  // GET /api/journey/:journeyId/skill-tree - Get skill tree by journey ID
  fastify.get('/:journeyId/skill-tree', {
    handler: getSkillTreeById,
  });

  // PATCH /api/journey/:journeyId/progress - Update journey-specific progress
  fastify.patch('/:journeyId/progress', {
    handler: updateJourneyProgress,
  });
}
