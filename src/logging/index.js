import { requestSerializer, responseSerializer, errorSerializer } from './serializers.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Log file path for development
export const DEV_LOG_FILE = join(__dirname, '../../logs/app.log');

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
