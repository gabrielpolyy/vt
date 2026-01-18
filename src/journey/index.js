import journeyRoutes from './routes.js';

export default async function journeyPlugin(fastify) {
  fastify.register(journeyRoutes, { prefix: '/api/journey' });
}
