import voiceProfileRoutes from './routes.js';

export default async function voiceProfilePlugin(fastify) {
  // Register voice profile routes under /api/voice-profile prefix
  fastify.register(voiceProfileRoutes, { prefix: '/api/voice-profile' });
}
