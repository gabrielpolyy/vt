import { requireAdmin } from '../auth/adminMiddleware.js';
import { getAdminHome, handleLogin, handleLogout, getHighwayForm, submitHighwayJob, getAudioExercises, toggleExerciseActive, updateExerciseLevel, updateExerciseGenre } from './handlers.js';
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

  // Audio exercises listing
  fastify.get('/audio-exercises', getAudioExercises);
  fastify.post('/audio-exercises/:id/toggle', toggleExerciseActive);
  fastify.post('/audio-exercises/:id/level', updateExerciseLevel);
  fastify.post('/audio-exercises/:id/genre', updateExerciseGenre);

  // Logs viewer
  fastify.get('/logs', getLogs);
}
