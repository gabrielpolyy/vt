import userRoutes from './routes.js';

export default async function usersPlugin(fastify) {
  fastify.register(userRoutes, { prefix: '/users' });
}
