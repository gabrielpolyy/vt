import { listExercises, getExercise, createAttempt, listProgress, getProgressBySlug } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function exercisesRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/exercises - List all exercises (optional ?type= filter)
  fastify.get('/', {
    handler: listExercises,
  });

  // GET /api/exercises/progress - Get progress for all exercises
  // NOTE: Must be before /:slug to avoid matching "progress" as slug
  fastify.get('/progress', {
    handler: listProgress,
  });

  // GET /api/exercises/:slug - Get exercise definition by slug
  fastify.get('/:slug', {
    handler: getExercise,
  });

  // GET /api/exercises/:slug/progress - Get detailed progress for single exercise
  fastify.get('/:slug/progress', {
    handler: getProgressBySlug,
  });

  // POST /api/exercises/:slug/attempts - Record an attempt
  fastify.post('/:slug/attempts', {
    handler: createAttempt,
  });
}
