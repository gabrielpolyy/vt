// Headers that should be redacted from logs
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

// Body fields that should be redacted
const SENSITIVE_BODY_FIELDS = ['password', 'token', 'secret', 'refreshToken', 'accessToken', 'identityToken'];

// Maximum body size to log (prevent huge payloads in logs)
const MAX_BODY_SIZE = 1000;

function sanitizeHeaders(headers) {
  if (!headers) return {};

  const sanitized = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function sanitizeBody(body) {
  if (!body) return undefined;
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

// Custom request serializer for verbose logging
export function requestSerializer(req) {
  return {
    method: req.method,
    url: req.url,
    headers: sanitizeHeaders(req.headers),
    query: req.query,
    body: sanitizeBody(req.body),
    remoteAddress: req.ip,
  };
}

// Custom response serializer
export function responseSerializer(res) {
  return {
    statusCode: res.statusCode,
  };
}

// Error serializer
export function errorSerializer(err) {
  return {
    type: err.constructor.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
  };
}
