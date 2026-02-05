import { sendTelegramAlert, formatServerError } from './telegramNotifier.js';

// Strip querystring from URL to prevent token leaks in logs
function stripQuerystring(url) {
  return url?.split('?')[0] || url;
}

// Register error-only logging hooks (Nginx handles HTTP-level logging)
export function registerLoggingHooks(fastify) {
  // Capture errors with full stack trace (onResponse doesn't have access to err)
  fastify.addHook('onError', async (request, reply, error) => {
    // Store error for onResponse to use
    request._serverError = error;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    // Only log server errors (5xx)
    if (reply.statusCode < 500) return;

    const safePath = stripQuerystring(request.url);
    const logData = {
      userId: request.user?.id || 'anonymous',
      method: request.method,
      url: safePath,
      status: reply.statusCode,
      ms: parseFloat(reply.elapsedTime?.toFixed(1) || 0),
    };

    // Include error details if captured
    if (request._serverError) {
      logData.err = {
        type: request._serverError.constructor?.name,
        message: request._serverError.message,
        stack: request._serverError.stack,
      };
    }

    request.log.error(logData, `${request.method} ${safePath} ${reply.statusCode}`);

    sendTelegramAlert(
      formatServerError({
        method: request.method,
        url: safePath,
        status: reply.statusCode,
        error: request._serverError?.message || 'Server error',
      })
    );
  });
}
