import { register, login, appleAuth, refresh, logout, me } from './handlers.js';
import { authenticate } from './middleware.js';

export default async function authRoutes(fastify) {
  // Public routes
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '15m' } },
    handler: register,
  });

  fastify.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '15m' } },
    handler: login,
  });

  fastify.post('/apple', {
    config: { rateLimit: { max: 10, timeWindow: '15m' } },
    handler: appleAuth,
  });

  fastify.post('/refresh', {
    config: { rateLimit: { max: 10, timeWindow: '15m' } },
    handler: refresh,
  });

  // Protected routes
  fastify.post('/logout', {
    preHandler: authenticate,
    handler: logout,
  });

  fastify.get('/me', {
    preHandler: authenticate,
    handler: me,
  });
}
