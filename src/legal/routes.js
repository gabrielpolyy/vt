import { getTos, getPrivacyPolicy } from './handlers.js';

export default async function legalRoutes(fastify) {
  fastify.get('/tos', { handler: getTos });
  fastify.get('/privacy', { handler: getPrivacyPolicy });
}
