import { sanitizeBody } from './serializers.js';
import { writeMobileLog, validateMobileLogPayload } from './mobileLogsHandler.js';

// Max payload size (10KB)
const MAX_PAYLOAD_SIZE = 10 * 1024;

export default async function mobileLogsRoutes(fastify) {
  // Rate limit: 50 requests/minute per IP
  fastify.register(import('@fastify/rate-limit'), {
    max: 50,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });

  fastify.post('/api/mobile-logs', {
    config: {
      rawBody: true,
    },
    preHandler: async (request, reply) => {
      // Check API key
      const apiKey = request.headers['x-app-key'];
      if (!apiKey || apiKey !== process.env.MOBILE_LOGS_API_KEY) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }

      // Check payload size
      const contentLength = parseInt(request.headers['content-length'] || '0', 10);
      if (contentLength > MAX_PAYLOAD_SIZE) {
        return reply.status(413).send({ error: 'Payload too large' });
      }
    },
    handler: async (request, reply) => {
      // Validate payload
      const errors = validateMobileLogPayload(request.body);
      if (errors.length > 0) {
        return reply.status(400).send({ error: 'Validation failed', details: errors });
      }

      // Sanitize and write log
      const sanitizedBody = sanitizeBody(request.body);
      const logData = {
        level: sanitizedBody.level || 'error',
        message: sanitizedBody.message,
        stackTrace: sanitizedBody.stackTrace,
        appVersion: sanitizedBody.appVersion,
        osVersion: sanitizedBody.osVersion,
        deviceModel: sanitizedBody.deviceModel,
        screen: sanitizedBody.screen,
        context: sanitizedBody.context,
      };

      const success = await writeMobileLog(logData);

      if (success) {
        return reply.status(200).send({ status: 'logged' });
      } else {
        return reply.status(500).send({ error: 'Failed to write log' });
      }
    },
  });
}
