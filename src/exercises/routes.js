import { listExercises, getExercise, createAttempt, listProgress, getProgressBySlug, getExerciseAudio, toggleFavorite } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function exercisesRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/exercises - List all exercises (optional ?type= and ?category= filters)
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

  // GET /api/exercises/:slug/audio - Get audio download URLs
  fastify.get('/:slug/audio', {
    handler: getExerciseAudio,
  });

  // POST /api/exercises/:slug/attempts - Record an attempt
  fastify.post('/:slug/attempts', {
    handler: createAttempt,
  });

  // POST /api/exercises/:slug/favorite - Toggle favorite status
  fastify.post('/:slug/favorite', {
    handler: toggleFavorite,
  });
}
