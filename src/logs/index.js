import logsRoutes from './routes.js';

export default async function logsPlugin(fastify) {
  fastify.register(logsRoutes, { prefix: '/logs' });
}
