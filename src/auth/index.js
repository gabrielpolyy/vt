import authRoutes from './routes.js';
import { authenticate } from './middleware.js';

export default async function authPlugin(fastify) {
  // Decorate fastify with authenticate function for use in other routes
  fastify.decorate('authenticate', authenticate);

  // Register auth routes under /auth prefix
  fastify.register(authRoutes, { prefix: '/auth' });
}

export { authenticate };
