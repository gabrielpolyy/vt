import dashboardRoutes, { activityRoutes } from './routes.js';

export default async function dashboardPlugin(fastify) {
  fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  fastify.register(activityRoutes, { prefix: '/api/activity' });
}
