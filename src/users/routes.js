import { updateName } from './handlers.js';
import { authenticate } from '../auth/middleware.js';

export default async function userRoutes(fastify) {
  fastify.patch('/name', {
    preHandler: authenticate,
    handler: updateName,
  });
}
