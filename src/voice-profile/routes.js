import { getProfile, saveProfile, getHistory } from './handlers.js';

export default async function voiceProfileRoutes(fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

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
}
