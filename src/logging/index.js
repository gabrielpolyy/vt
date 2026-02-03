import { requestSerializer, responseSerializer, errorSerializer } from './serializers.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appendFile, mkdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Log file paths
export const DEV_LOG_FILE = join(__dirname, '../../logs/app.log');
export const TRANSPOSITION_LOG_FILE = join(__dirname, '../../logs/transpositions.log');

// Log transposition data to dedicated file
export async function logTransposition(data) {
  try {
    const logDir = dirname(TRANSPOSITION_LOG_FILE);
    await mkdir(logDir, { recursive: true });
    await appendFile(TRANSPOSITION_LOG_FILE, JSON.stringify(data) + '\n');
  } catch (err) {
    console.error('Failed to write transposition log:', err.message);
  }
}

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
export { default as mobileLogsRoutes } from './mobileLogsRoutes.js';
export { MOBILE_LOG_FILE } from './mobileLogsHandler.js';
