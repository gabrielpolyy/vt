import { listExercises, getExercise } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function exercisesRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/exercises - List all exercises (optional ?type= filter)
  fastify.get('/', {
    handler: listExercises,
  });

  // GET /api/exercises/:slug - Get exercise definition by slug
  fastify.get('/:slug', {
    handler: getExercise,
  });
}
