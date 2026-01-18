import dashboardRoutes from './routes.js';

export default async function dashboardPlugin(fastify) {
  fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
}
