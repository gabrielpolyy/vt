import { sanitizeBody, shouldLogRoute } from './serializers.js';
import { sendTelegramAlert, formatServerError } from './telegramNotifier.js';

// Register request/response logging hooks
export function registerLoggingHooks(fastify) {
  // Store response body for logging
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Store response body for logging (parse JSON if possible)
    if (payload && typeof payload === 'string') {
      try {
        request._responseBody = JSON.parse(payload);
      } catch {
        request._responseBody = payload.length > 500 ? payload.slice(0, 500) + '...' : payload;
      }
    }
    return payload;
  });

  // Log after response is sent
  fastify.addHook('onResponse', async (request, reply) => {
    // Skip logging for certain routes
    if (!shouldLogRoute(request.url)) return;

    const responseTime = reply.elapsedTime?.toFixed(1) || 0;

    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      status: reply.statusCode,
      ms: parseFloat(responseTime),
      ip: request.ip,
      ua: request.headers['user-agent'] || '-',
    };

    // Add query params if present
    if (request.query && Object.keys(request.query).length > 0) {
      logData.query = request.query;
    }

    // Add request body if present (sanitized)
    if (request.body && Object.keys(request.body).length > 0) {
      logData.reqBody = sanitizeBody(request.body);
    }

    // Add response body if present (sanitized)
    if (request._responseBody) {
      logData.resBody = sanitizeBody(request._responseBody);
    }

    // Add transposition details if present (for exercise requests)
    if (request.transpositionLog) {
      logData.transposition = request.transpositionLog;
    }

    // Choose log level based on status code
    const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info';

    request.log[level](logData, `${request.method} ${request.url} ${reply.statusCode}`);

    // Send Telegram notification for server errors (5xx)
    if (reply.statusCode >= 500) {
      const errorMsg = request._responseBody?.error || request._responseBody?.message || 'Internal server error';
      sendTelegramAlert(
        formatServerError({
          method: request.method,
          url: request.url,
          status: reply.statusCode,
          ip: request.ip,
          error: errorMsg,
        })
      );
    }
  });
}
