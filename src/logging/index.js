import { requestSerializer, responseSerializer, errorSerializer } from './serializers.js';

// Build logger options for Fastify
export function buildLoggerOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  const options = {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req: requestSerializer,
      res: responseSerializer,
      err: errorSerializer,
    },
  };

  // Pretty print for development
  if (!isProduction) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return options;
}

export { requestSerializer, responseSerializer, errorSerializer };
