import { getProfile, saveProfile, getHistory, saveWarmupSession } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function voiceProfileRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/voice-profile - Get current voice profile
  fastify.get('/', {
    handler: getProfile,
  });

  // POST /api/voice-profile - Save voice exploration session
  fastify.post('/', {
    handler: saveProfile,
  });

  // GET /api/voice-profile/history - Get session history
  fastify.get('/history', {
    handler: getHistory,
  });

  // POST /api/voice-profile/session - Save warmup session with full pitch samples
  fastify.post('/session', {
    handler: saveWarmupSession,
  });
}
