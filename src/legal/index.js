import routes from './routes.js';

export default async function legalPlugin(fastify) {
  fastify.register(routes);
}
