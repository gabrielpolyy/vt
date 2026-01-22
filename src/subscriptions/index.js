import { registerRoutes } from './routes.js';

export default async function subscriptionsPlugin(fastify) {
  registerRoutes(fastify);
}
