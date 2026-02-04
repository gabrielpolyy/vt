import { mobileLogger } from './loggers.js';
import { sendTelegramAlert, formatMobileError } from './telegramNotifier.js';

// Valid log levels
const VALID_LEVELS = ['error', 'warn', 'info', 'debug'];

// Write mobile log entry via Pino
export function writeMobileLog(logData) {
  const logEntry = {
    msg: logData.message,
    ...(logData.stackTrace && { stack: logData.stackTrace }),
    app: logData.appVersion,
    os: logData.osVersion,
    device: logData.deviceModel,
    screen: logData.screen,
    ...(logData.context && { context: logData.context }),
  };

  // Clamp level to valid levels with fallback (defense in depth)
  const safeLevel = VALID_LEVELS.includes(logData.level) ? logData.level : 'info';

  try {
    mobileLogger[safeLevel](logEntry);

    // Send Telegram notification for mobile errors
    if (safeLevel === 'error') {
      sendTelegramAlert(
        formatMobileError({
          screen: logData.screen,
          device: logData.deviceModel,
          osVersion: logData.osVersion,
          appVersion: logData.appVersion,
          message: logData.message,
          stackTrace: logData.stackTrace,
        })
      );
    }

    return true;
  } catch (err) {
    console.error('Failed to write mobile log:', err.message);
    return false;
  }
}

// Validate mobile log payload
export function validateMobileLogPayload(body) {
  const errors = [];

  if (!body.message || typeof body.message !== 'string') {
    errors.push('message is required and must be a string');
  }

  if (body.level && !VALID_LEVELS.includes(body.level)) {
    errors.push(`level must be one of: ${VALID_LEVELS.join(', ')}`);
  }

  if (!body.appVersion || typeof body.appVersion !== 'string') {
    errors.push('appVersion is required and must be a string');
  }

  if (!body.osVersion || typeof body.osVersion !== 'string') {
    errors.push('osVersion is required and must be a string');
  }

  if (!body.deviceModel || typeof body.deviceModel !== 'string') {
    errors.push('deviceModel is required and must be a string');
  }

  if (!body.screen || typeof body.screen !== 'string') {
    errors.push('screen is required and must be a string');
  }

  if (body.stackTrace && typeof body.stackTrace !== 'string') {
    errors.push('stackTrace must be a string');
  }

  if (body.context && typeof body.context !== 'object') {
    errors.push('context must be an object');
  }

  return errors;
}
