import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { DEV_LOG_FILE } from '../logging/index.js';
import { renderLogsLogin, renderLogs } from './templates/logs.js';

// Default PM2 log paths
const PM2_LOG_DIR = join(homedir(), '.pm2', 'logs');

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
      method: parsed.method,
      url: parsed.url,
      status: parsed.status,
      ms: parsed.ms,
      ip: parsed.ip,
      ua: parsed.ua,
      query: parsed.query,
      reqBody: parsed.reqBody,
      resBody: parsed.resBody,
      transposition: parsed.transposition,
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
  const appName = process.env.PM2_APP_NAME || 'vt';
  const files = [];

  // Check for dev log file first
  if (existsSync(DEV_LOG_FILE)) {
    files.push({ name: 'dev', path: DEV_LOG_FILE });
  }

  // PM2 log files
  const outLog = join(PM2_LOG_DIR, `${appName}-out.log`);
  const errLog = join(PM2_LOG_DIR, `${appName}-error.log`);

  if (existsSync(outLog)) files.push({ name: 'stdout', path: outLog });
  if (existsSync(errLog)) files.push({ name: 'stderr', path: errLog });

  // Also check for numbered instances (PM2 cluster mode)
  for (let i = 0; i < 10; i++) {
    const outLogN = join(PM2_LOG_DIR, `${appName}-out-${i}.log`);
    const errLogN = join(PM2_LOG_DIR, `${appName}-error-${i}.log`);
    if (existsSync(outLogN)) files.push({ name: `stdout-${i}`, path: outLogN });
    if (existsSync(errLogN)) files.push({ name: `stderr-${i}`, path: errLogN });
  }

  return files;
}

// Route filters - map friendly name to URL patterns
const ROUTE_FILTERS = {
  auth: ['/auth'],
  exercises: ['/api/exercises'],
  'voice-profile': ['/api/voice-profile'],
  health: ['/api/health', '/api/db-check'],
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

  // Filter by route (only show request logs matching the pattern)
  if (route && ROUTE_FILTERS[route]) {
    const patterns = ROUTE_FILTERS[route];
    allLogs = allLogs.filter(log => {
      if (!log.url) return false; // Exclude non-request logs
      return patterns.some(pattern => log.url.startsWith(pattern));
    });
  }

  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    allLogs = allLogs.filter(log =>
      log.msg?.toLowerCase().includes(searchLower) ||
      log.url?.toLowerCase().includes(searchLower) ||
      log.ip?.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.reqBody || {}).toLowerCase().includes(searchLower) ||
      JSON.stringify(log.resBody || {}).toLowerCase().includes(searchLower)
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
