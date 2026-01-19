import { authenticate } from '../auth/middleware.js';
import { requireAdminApi } from '../auth/adminMiddleware.js';
import { createGenerateHighwayJob } from './handlers.js';

export default async function jobsRoutes(fastify) {
  fastify.post('/generate-highway', {
    preHandler: [authenticate, requireAdminApi],
    handler: createGenerateHighwayJob,
  });
}
