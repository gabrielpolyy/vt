import { requestSerializer, responseSerializer, errorSerializer } from './serializers.js';
import {
  DEV_LOG_FILE,
  TRANSPOSITION_LOG_FILE,
  MOBILE_LOG_FILE,
  transpositionLogger,
  mobileLogger,
  logTransposition,
} from './loggers.js';

const isProduction = process.env.NODE_ENV === 'production';

// Re-export from loggers.js
export {
  DEV_LOG_FILE,
  TRANSPOSITION_LOG_FILE,
  MOBILE_LOG_FILE,
  transpositionLogger,
  mobileLogger,
  logTransposition,
};

// Build logger options for Fastify (main app logger)
export function buildLoggerOptions() {
  const options = {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req: requestSerializer,
      res: responseSerializer,
      err: errorSerializer,
    },
  };

  if (!isProduction) {
    // Development: pretty console + JSON file for logs viewer
    options.transport = {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        {
          target: 'pino/file',
          options: { destination: DEV_LOG_FILE, mkdir: true },
        },
      ],
    };
  }

  return options;
}

export { requestSerializer, responseSerializer, errorSerializer } from './serializers.js';
export { registerLoggingHooks } from './hooks.js';
export { default as mobileLogsRoutes } from './mobileLogsRoutes.js';
