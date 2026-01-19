import { authenticate } from '../auth/middleware.js';
import { createGenerateHighwayJob } from './handlers.js';

export default async function jobsRoutes(fastify) {
  fastify.post('/generate-highway', {
    preHandler: authenticate,
    handler: createGenerateHighwayJob,
  });
}
