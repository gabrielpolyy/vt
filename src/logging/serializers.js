// Body fields that should be redacted
const SENSITIVE_BODY_FIELDS = ['password', 'token', 'secret', 'refreshToken', 'accessToken', 'identityToken'];

// Maximum body size to log
const MAX_BODY_SIZE = 2000;

// Routes to skip logging
const SKIP_ROUTES = ['/logs', '/logs/login', '/logs/logout'];

export function sanitizeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== 'object') {
    const str = String(body);
    return str.length > MAX_BODY_SIZE ? str.slice(0, MAX_BODY_SIZE) + '...[truncated]' : str;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_BODY_FIELDS.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else if (typeof value === 'string' && value.length > MAX_BODY_SIZE) {
      sanitized[key] = value.slice(0, MAX_BODY_SIZE) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Check if route should be logged
export function shouldLogRoute(url) {
  const path = url.split('?')[0];
  return !SKIP_ROUTES.some(skip => path.startsWith(skip));
}

// Disable default Fastify request/response logging
export function requestSerializer() {
  return undefined;
}

export function responseSerializer() {
  return undefined;
}

// Error serializer
export function errorSerializer(err) {
  return {
    type: err.constructor.name,
    message: err.message,
    stack: err.stack,
  };
}
