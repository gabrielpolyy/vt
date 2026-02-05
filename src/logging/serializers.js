// Body fields that should be redacted (case-insensitive matching)
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'refreshToken', 'accessToken',
  'identityToken', 'email', 'authorizationCode', 'appleAuthorizationCode',
  'resetToken', 'code', 'authorization'
];

// Query params that should be redacted
const SENSITIVE_QUERY_PARAMS = ['token', 'code', 'secret', 'key'];

// Maximum body size to log
const MAX_BODY_SIZE = 2000;

// Routes to skip logging
const SKIP_ROUTES = ['/admin/logs', '/logs', '/health'];

export function sanitizeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== 'object') {
    const str = String(body);
    return str.length > MAX_BODY_SIZE ? str.slice(0, MAX_BODY_SIZE) + '...[truncated]' : str;
  }

  // Preserve arrays
  if (Array.isArray(body)) {
    return body.map(item => sanitizeBody(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase() === f.toLowerCase())) {
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

// Sanitize query params by redacting sensitive values
export function sanitizeQuery(query) {
  if (!query || typeof query !== 'object') return query;
  const sanitized = { ...query };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_QUERY_PARAMS.some(p => key.toLowerCase().includes(p))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
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
