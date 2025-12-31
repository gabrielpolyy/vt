import { aiClient, getProvider } from './client.js';
import { aiConfig } from './config.js';
import * as aiServices from './services.js';

/**
 * Fastify plugin for AI functionality
 */
export default async function aiPlugin(fastify) {
  fastify.decorate('ai', {
    client: aiClient,
    services: aiServices,
    config: aiConfig,
    getProvider,
  });
}

export { aiClient, aiServices, aiConfig, getProvider };
export { generateExercise, chat, generateFeedback, generateHighwayExercise } from './services.js';
