import { readFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { DEV_LOG_FILE } from '../logging/index.js';
import { renderLogsLogin, renderLogs } from './templates/logs.js';

// PM2 log directory - default location
const PM2_LOG_DIR = join(homedir(), '.pm2', 'logs');
const APP_NAME = 'vt';

// Map log level numbers to names
const LEVEL_NAMES = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

// Messages to filter out from logs
const SKIP_MESSAGES = [
  'incoming request',
  'request completed',
  'Server listening',
  'Server running',
];

function parseLogLine(line) {
  try {
    const parsed = JSON.parse(line);
    const msg = parsed.msg || '';

    // Skip internal Fastify messages
    if (SKIP_MESSAGES.some(skip => msg.startsWith(skip))) {
      return null;
    }

    return {
      time: parsed.time ? new Date(parsed.time).toISOString() : null,
      level: LEVEL_NAMES[parsed.level] || 'info',
      msg,
      event: parsed.event,
      userId: parsed.userId,
      method: parsed.method,
      url: parsed.url,
      status: parsed.status,
      ms: parsed.ms,
      err: parsed.err,
    };
  } catch {
    // Non-JSON line
    return null;
  }
}

async function readLogFile(filePath, limit = 500) {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = await readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  // Get last N lines, parse them, and filter out nulls
  const recentLines = lines.slice(-limit * 2); // Read more to account for filtered items
  return recentLines
    .map(parseLogLine)
    .filter(Boolean)
    .reverse()
    .slice(0, limit);
}

function findLogFiles() {
  const files = [];

  // Check for dev log file first
  if (existsSync(DEV_LOG_FILE)) {
    files.push({ name: 'dev', path: DEV_LOG_FILE });
  }

  // Scan PM2 log directory for any vt-related logs
  if (existsSync(PM2_LOG_DIR)) {
    try {
      const dirFiles = readdirSync(PM2_LOG_DIR);
      for (const file of dirFiles) {
        if (file.startsWith(`${APP_NAME}-`) || file.startsWith(`${APP_NAME}.`)) {
          const filePath = join(PM2_LOG_DIR, file);
          let name = file.replace(`${APP_NAME}-`, '').replace(`${APP_NAME}.`, '').replace('.log', '');
          if (file.includes('out')) name = 'stdout';
          if (file.includes('error')) name = 'stderr';
          files.push({ name, path: filePath });
        }
      }
    } catch {
      // Directory read failed
    }
  }

  return files;
}

// Route filters - map friendly name to URL patterns and event prefixes
const ROUTE_FILTERS = {
  auth: { urls: ['/auth'], events: ['auth.'] },
  exercises: { urls: ['/api/exercises'], events: [] },
  'voice-profile': { urls: ['/api/voice-profile'], events: [] },
  subscriptions: { urls: ['/api/subscriptions', '/api/webhooks'], events: ['subscription.'] },
  health: { urls: ['/api/health', '/api/db-check'], events: [] },
  email: { urls: [], events: ['email.'] },
};

export async function getLogs(request, reply) {
  // Show login form if not authenticated
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogsLogin(request.loginError || ''));
  }

  const { level, search, limit = 500, source, route } = request.query;

  const logFiles = findLogFiles();

  if (logFiles.length === 0) {
    return reply.type('text/html').send(renderLogs([], {
      message: 'No PM2 log files found. Make sure the app is running under PM2.',
      appName: process.env.PM2_APP_NAME || 'vt',
      logDir: PM2_LOG_DIR,
    }));
  }

  // Read from specified source or all sources
  let allLogs = [];
  for (const file of logFiles) {
    if (source && file.name !== source) continue;
    const logs = await readLogFile(file.path, parseInt(limit));
    allLogs.push(...logs.map(log => ({ ...log, source: file.name })));
  }

  // Sort by time (most recent first)
  allLogs.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return new Date(b.time) - new Date(a.time);
  });

  // Filter by level
  if (level) {
    allLogs = allLogs.filter(log => log.level === level);
  }

  // Filter by route (match URL patterns or event prefixes)
  if (route && ROUTE_FILTERS[route]) {
    const { urls, events } = ROUTE_FILTERS[route];
    allLogs = allLogs.filter(log => {
      // Match URL patterns
      if (log.url && urls.some(pattern => log.url.startsWith(pattern))) {
        return true;
      }
      // Match event prefixes
      if (log.event && events.some(prefix => log.event.startsWith(prefix))) {
        return true;
      }
      return false;
    });
  }

  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    allLogs = allLogs.filter(log =>
      log.msg?.toLowerCase().includes(searchLower) ||
      log.event?.toLowerCase().includes(searchLower) ||
      log.url?.toLowerCase().includes(searchLower) ||
      log.userId?.toString().toLowerCase().includes(searchLower)
    );
  }

  // Limit results
  allLogs = allLogs.slice(0, parseInt(limit));

  return reply.type('text/html').send(renderLogs(allLogs, {
    sources: logFiles.map(f => f.name),
    routes: Object.keys(ROUTE_FILTERS),
    currentLevel: level,
    currentSearch: search,
    currentSource: source,
    currentRoute: route,
    currentLimit: limit,
  }));
}
