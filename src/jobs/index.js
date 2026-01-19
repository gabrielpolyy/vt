import jobsRoutes from './routes.js';

export default async function jobsPlugin(fastify) {
  fastify.register(jobsRoutes, { prefix: '/api/jobs' });
}
