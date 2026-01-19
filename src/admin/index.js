import routes from './routes.js';

export default async function adminPlugin(fastify) {
  fastify.register(routes, { prefix: '/admin' });
}
