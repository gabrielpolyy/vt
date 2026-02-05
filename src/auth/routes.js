import { register, login, appleAuth, refresh, logout, me, checkEmail, guestLogin, claimWithPassword, claimWithApple, requestPasswordReset, resetPassword } from './handlers.js';
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

  fastify.post('/guest', {
    config: { rateLimit: { max: 10, timeWindow: '15m' } },
    handler: guestLogin,
  });

  fastify.get('/check-email', {
    config: { rateLimit: { max: 10, timeWindow: '1m' } },
    handler: checkEmail,
  });

  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '15m' } },
    handler: requestPasswordReset,
  });

  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '15m' } },
    handler: resetPassword,
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

  fastify.post('/claim', {
    preHandler: authenticate,
    handler: claimWithPassword,
  });

  fastify.post('/claim/apple', {
    preHandler: authenticate,
    handler: claimWithApple,
  });
}
