import { updateName, deleteAccount } from './handlers.js';
import { authenticate, requireRegistered } from '../auth/middleware.js';

export default async function userRoutes(fastify) {
  fastify.patch('/name', {
    preHandler: authenticate,
    handler: updateName,
  });

  fastify.delete('/account', {
    preHandler: [authenticate, requireRegistered],
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 hour',
      },
    },
    handler: deleteAccount,
  });

  // POST alternative for clients/proxies that strip DELETE body
  fastify.post('/account/delete', {
    preHandler: [authenticate, requireRegistered],
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 hour',
      },
    },
    handler: deleteAccount,
  });
}
