import { authenticate, requireRegistered } from '../auth/middleware.js';
import { verify, restore } from './handlers.js';
import { handleAppleWebhook } from './webhook-handlers.js';
import { runReconciliation } from './reconciliation.js';

export function registerRoutes(fastify) {
  // Verify a new purchase
  fastify.post(
    '/subscriptions/verify',
    {
      preHandler: [authenticate, requireRegistered],
    },
    verify
  );

  // Restore purchases
  fastify.post(
    '/subscriptions/restore',
    {
      preHandler: [authenticate, requireRegistered],
    },
    restore
  );

  // Apple webhook endpoint (no auth - Apple calls this)
  fastify.post('/webhooks/apple-subscriptions', handleAppleWebhook);

  // Manual reconciliation trigger (admin only, called by cron)
  // Protected by API key in production
  fastify.post('/admin/subscriptions/reconcile', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const result = await runReconciliation(request.log);
      return result;
    } catch (err) {
      request.log.error({ err }, 'Reconciliation failed');
      return reply.code(500).send({ error: 'Reconciliation failed' });
    }
  });
}
