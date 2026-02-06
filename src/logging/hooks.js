import { sendTelegramAlert, formatServerError } from './telegramNotifier.js';
import { sanitizeBody } from './serializers.js';

// Strip querystring from URL to prevent token leaks in logs
function stripQuerystring(url) {
  return url?.split('?')[0] || url;
}

// Static file extensions to skip logging
const STATIC_EXT = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)$/i;

// Check if request logging is enabled (default: true)
const LOG_REQUESTS = process.env.LOG_REQUESTS !== 'false';

// Parse and sanitize response body for logging
function prepareResponseBody(payload) {
  if (!payload) return undefined;
  if (Buffer.isBuffer(payload)) {
    try { return sanitizeBody(JSON.parse(payload.toString())); }
    catch { return payload.toString().slice(0, 2000); }
  }
  if (typeof payload === 'string') {
    try { return sanitizeBody(JSON.parse(payload)); }
    catch { return payload.slice(0, 2000); }
  }
  return sanitizeBody(payload);
}

// Register logging hooks
export function registerLoggingHooks(fastify) {
  // Capture errors with full stack trace (onResponse doesn't have access to err)
  fastify.addHook('onError', async (request, reply, error) => {
    // Store error for onResponse to use
    request._serverError = error;
  });

  // Capture response body before it's sent
  fastify.addHook('onSend', async (request, reply, payload) => {
    request._responseBody = payload;
    return payload; // Must return unchanged
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const safePath = stripQuerystring(request.url);
    const statusCode = reply.statusCode;
    const isServerError = statusCode >= 500;

    // Handle 5xx errors - always log and send Telegram alert
    if (isServerError) {
      const logData = {
        userId: request.user?.id || 'anonymous',
        method: request.method,
        url: safePath,
        status: statusCode,
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

      request.log.error(logData, `${request.method} ${safePath} ${statusCode}`);

      sendTelegramAlert(
        formatServerError({
          method: request.method,
          url: safePath,
          status: statusCode,
          error: request._serverError?.message || 'Server error',
        })
      );
      return;
    }

    // Skip request logging if disabled or static file
    if (!LOG_REQUESTS) return;
    if (STATIC_EXT.test(safePath)) return;

    // Build log data for non-5xx requests
    const logData = {
      userId: request.user?.id || 'anonymous',
      ms: parseFloat(reply.elapsedTime?.toFixed(1) || 0),
    };

    // Include params if present
    if (request.params && Object.keys(request.params).length > 0) {
      logData.params = request.params;
    }

    // Include query if present
    if (request.query && Object.keys(request.query).length > 0) {
      logData.query = sanitizeBody(request.query);
    }

    // Include request body if present
    if (request.body && Object.keys(request.body).length > 0) {
      logData.reqBody = sanitizeBody(request.body);
    }

    // Include response body
    const resBody = prepareResponseBody(request._responseBody);
    if (resBody !== undefined) {
      logData.resBody = resBody;
    }

    const logMessage = `${request.method} ${safePath} ${statusCode}`;

    // Use appropriate log level based on status
    if (statusCode >= 400) {
      request.log.warn(logData, logMessage);
    } else {
      request.log.info(logData, logMessage);
    }
  });
}
