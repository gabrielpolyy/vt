import exercisesRoutes from './routes.js';

export default async function exercisesPlugin(fastify) {
  fastify.register(exercisesRoutes, { prefix: '/api/exercises' });
}
