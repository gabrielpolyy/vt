import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

// Log file paths (dev only)
export const DEV_LOG_FILE = join(__dirname, '../../logs/app.log');
export const TRANSPOSITION_LOG_FILE = join(__dirname, '../../logs/transpositions.log');
export const MOBILE_LOG_FILE = join(__dirname, '../../logs/mobile.log');

// Create a Pino logger with optional file destination (dev only)
function createLogger(type, devFilePath) {
  const options = {
    level: process.env.LOG_LEVEL || 'info',
    base: { type }, // Adds `type` field to every log entry
  };

  if (!isProduction && devFilePath) {
    // Development: pretty console + JSON file
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
          options: { destination: devFilePath, mkdir: true },
        },
      ],
    };
  }
  // Production: stdout (default) for PM2 capture

  return pino(options);
}

// Specialized loggers
export const transpositionLogger = createLogger('transposition', TRANSPOSITION_LOG_FILE);
export const mobileLogger = createLogger('mobile', MOBILE_LOG_FILE);

// Helper function for transposition logging
export function logTransposition(data) {
  transpositionLogger.info(data);
}
