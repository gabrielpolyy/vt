import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { findUserByEmail } from '../users/repository.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { db } from '../db.js';
import { DEV_LOG_FILE } from '../logging/index.js';

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

const LEVEL_COLORS = {
  trace: '#6b7280',
  debug: '#3b82f6',
  info: '#22c55e',
  warn: '#f59e0b',
  error: '#ef4444',
  fatal: '#dc2626',
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
    return reply.type('text/html').send(renderLoginForm(request.loginError || ''));
  }

  const { level, search, limit = 500, source, route } = request.query;

  const logFiles = findLogFiles();

  if (logFiles.length === 0) {
    return reply.type('text/html').send(renderHtml([], {
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

  return reply.type('text/html').send(renderHtml(allLogs, {
    sources: logFiles.map(f => f.name),
    routes: Object.keys(ROUTE_FILTERS),
    currentLevel: level,
    currentSearch: search,
    currentSource: source,
    currentRoute: route,
    currentLimit: limit,
  }));
}

function renderHtml(logs, options = {}) {
  const { sources = [], routes = [], currentLevel, currentSearch, currentSource, currentRoute, currentLimit = 500, message } = options;

  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logs Viewer</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 20px;
    }
    h1 { margin: 0 0 20px 0; font-size: 1.5rem; display: flex; align-items: center; gap: 10px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .logout { color: #94a3b8; text-decoration: none; font-size: 14px; }
    .logout:hover { color: #e2e8f0; }
    .filters {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .filters select, .filters input, .filters button {
      padding: 8px 12px;
      border: 1px solid #334155;
      border-radius: 6px;
      background: #1e293b;
      color: #e2e8f0;
      font-size: 14px;
    }
    .filters button {
      background: #3b82f6;
      border-color: #3b82f6;
      cursor: pointer;
    }
    .filters button:hover { background: #2563eb; }
    .message {
      background: #1e293b;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #334155;
    }
    .count { color: #64748b; font-size: 14px; }
    .logs { display: flex; flex-direction: column; gap: 8px; }
    .log-entry {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px 16px;
      border-left: 3px solid #334155;
    }
    .log-entry.level-error, .log-entry.level-fatal { border-left-color: ${LEVEL_COLORS.error}; }
    .log-entry.level-warn { border-left-color: ${LEVEL_COLORS.warn}; }
    .log-entry.level-info { border-left-color: ${LEVEL_COLORS.info}; }
    .log-entry.level-debug { border-left-color: ${LEVEL_COLORS.debug}; }
    .log-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .level {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .level-trace { background: ${LEVEL_COLORS.trace}20; color: ${LEVEL_COLORS.trace}; }
    .level-debug { background: ${LEVEL_COLORS.debug}20; color: ${LEVEL_COLORS.debug}; }
    .level-info { background: ${LEVEL_COLORS.info}20; color: ${LEVEL_COLORS.info}; }
    .level-warn { background: ${LEVEL_COLORS.warn}20; color: ${LEVEL_COLORS.warn}; }
    .level-error { background: ${LEVEL_COLORS.error}20; color: ${LEVEL_COLORS.error}; }
    .level-fatal { background: ${LEVEL_COLORS.fatal}20; color: ${LEVEL_COLORS.fatal}; }
    .status {
      font-family: monospace;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .status-2xx { background: ${LEVEL_COLORS.info}20; color: ${LEVEL_COLORS.info}; }
    .status-4xx { background: ${LEVEL_COLORS.warn}20; color: ${LEVEL_COLORS.warn}; }
    .status-5xx { background: ${LEVEL_COLORS.error}20; color: ${LEVEL_COLORS.error}; }
    .time { color: #64748b; font-size: 12px; font-family: monospace; }
    .method { font-weight: 600; color: #a78bfa; }
    .url { color: #e2e8f0; font-family: monospace; }
    .ms { color: #64748b; font-size: 12px; }
    .meta { display: flex; gap: 16px; font-size: 12px; color: #94a3b8; margin-top: 8px; flex-wrap: wrap; }
    .meta-item { display: flex; gap: 4px; }
    .meta-label { color: #64748b; }
    .body-section { margin-top: 10px; }
    .body-label { font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
    .body-content {
      background: #0f172a;
      padding: 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 100px;
      overflow: hidden;
      cursor: pointer;
      position: relative;
    }
    .body-content:hover { background: #1a2744; }
    .body-content::after {
      content: 'Click to expand';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px;
      background: linear-gradient(transparent, #0f172a);
      text-align: center;
      font-size: 11px;
      color: #64748b;
    }
    .error-msg { color: ${LEVEL_COLORS.error}; }
    .plain-msg { color: #e2e8f0; padding: 4px 0; }

    /* Transposition styles */
    .transposition-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      background: #0f172a;
      border-radius: 6px;
      font-size: 13px;
    }
    .transposition-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .transposition-voice {
      color: #a78bfa;
      font-weight: 500;
    }
    .transposition-shift {
      color: #22c55e;
      font-weight: 500;
    }
    .transposition-notes {
      color: #94a3b8;
      font-family: monospace;
    }
    .stretch-row {
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid #334155;
    }
    .stretch-label {
      color: #f59e0b;
      font-weight: 500;
    }
    .stretch-notes {
      color: #fbbf24;
      font-family: monospace;
    }
    .transposition-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .copy-btn {
      background: #334155;
      border: none;
      color: #e2e8f0;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      text-transform: none;
    }
    .copy-btn:hover { background: #475569; }
    .copy-btn.copied { background: #22c55e; }

    /* Modal styles */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      padding: 20px;
    }
    .modal.open { display: flex; align-items: center; justify-content: center; }
    .modal-content {
      background: #1e293b;
      border-radius: 12px;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #334155;
    }
    .modal-title { font-weight: 600; font-size: 14px; text-transform: uppercase; color: #94a3b8; }
    .modal-actions { display: flex; gap: 12px; align-items: center; }
    .modal-copy {
      background: #334155;
      border: none;
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    .modal-copy:hover { background: #475569; }
    .modal-copy.copied { background: #22c55e; }
    .modal-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .modal-close:hover { color: #e2e8f0; }
    .modal-body {
      padding: 20px;
      overflow: auto;
      flex: 1;
    }
    .modal-body pre {
      margin: 0;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <!-- Modal -->
  <div class="modal" id="modal" onclick="if(event.target===this)closeModal()">
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title" id="modal-title">Body</span>
        <div class="modal-actions">
          <button class="modal-copy" id="modal-copy" onclick="copyContent()">Copy</button>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
      </div>
      <div class="modal-body">
        <pre id="modal-body"></pre>
      </div>
    </div>
  </div>

  <script>
    function openModal(title, content) {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').textContent = content;
      document.getElementById('modal').classList.add('open');
      document.getElementById('modal-copy').classList.remove('copied');
      document.getElementById('modal-copy').textContent = 'Copy';
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      document.getElementById('modal').classList.remove('open');
      document.body.style.overflow = '';
    }
    function copyContent() {
      const content = document.getElementById('modal-body').textContent;
      navigator.clipboard.writeText(content).then(() => {
        const btn = document.getElementById('modal-copy');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    }
    function copyTransposition(btn) {
      const data = JSON.parse(btn.dataset.transposition);
      navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy JSON';
          btn.classList.remove('copied');
        }, 2000);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    document.addEventListener('click', (e) => {
      const body = e.target.closest('.body-content');
      if (body) {
        const title = body.previousElementSibling?.textContent || 'Details';
        const content = body.textContent.replace('Click to expand', '').trim();
        openModal(title, content);
      }
    });
  </script>
  <div class="header">
    <h1>Logs Viewer <span class="count">${logs.length} entries</span></h1>
    <form method="POST" action="/logs/logout" style="margin:0">
      <button type="submit" class="logout" style="background:none;border:none;cursor:pointer">Logout</button>
    </form>
  </div>

  <form class="filters" method="GET">
    <select name="level">
      <option value="">All Levels</option>
      ${levels.map(l => `<option value="${l}" ${currentLevel === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
    </select>

    ${sources.length > 0 ? `
    <select name="source">
      <option value="">All Sources</option>
      ${sources.map(s => `<option value="${s}" ${currentSource === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
    ` : ''}

    <select name="route">
      <option value="">All Routes</option>
      ${routes.map(r => `<option value="${r}" ${currentRoute === r ? 'selected' : ''}>${r}</option>`).join('')}
    </select>

    <input type="text" name="search" placeholder="Search logs..." value="${currentSearch || ''}">
    <input type="number" name="limit" placeholder="Limit" value="${currentLimit}" style="width: 80px">
    <button type="submit">Filter</button>
  </form>

  ${message ? `<div class="message"><p>${message}</p><p>App name: ${options.appName}</p><p>Log dir: ${options.logDir}</p></div>` : `
  <div class="logs">
    ${logs.map(log => {
      const isRequest = log.method && log.url;
      const statusClass = log.status >= 500 ? 'status-5xx' : log.status >= 400 ? 'status-4xx' : 'status-2xx';

      if (isRequest) {
        return `
        <div class="log-entry level-${log.level}">
          <div class="log-header">
            <span class="level level-${log.level}">${log.level}</span>
            <span class="status ${statusClass}">${log.status}</span>
            <span class="method">${log.method}</span>
            <span class="url">${escapeHtml(log.url)}</span>
            <span class="ms">${log.ms}ms</span>
            <span class="time">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
          </div>
          <div class="meta">
            <div class="meta-item"><span class="meta-label">IP:</span> ${escapeHtml(log.ip || '-')}</div>
            <div class="meta-item"><span class="meta-label">UA:</span> ${escapeHtml((log.ua || '-').slice(0, 80))}</div>
          </div>
          ${log.query && Object.keys(log.query).length ? `
          <div class="body-section">
            <div class="body-label">Query</div>
            <div class="body-content">${escapeHtml(JSON.stringify(log.query, null, 2))}</div>
          </div>` : ''}
          ${log.reqBody ? `
          <div class="body-section">
            <div class="body-label">Request Body</div>
            <div class="body-content">${escapeHtml(JSON.stringify(log.reqBody, null, 2))}</div>
          </div>` : ''}
          ${log.resBody ? `
          <div class="body-section">
            <div class="body-label">Response Body</div>
            <div class="body-content">${escapeHtml(JSON.stringify(log.resBody, null, 2))}</div>
          </div>` : ''}
          ${log.transposition ? `
          <div class="body-section">
            <div class="body-label transposition-header">
              Transposition
              <button class="copy-btn" data-transposition='${escapeHtml(JSON.stringify(log.transposition))}' onclick="copyTransposition(this)">Copy JSON</button>
            </div>
            <div class="transposition-info">
              <div class="transposition-row">
                <span class="transposition-voice">Voice: ${escapeHtml(log.transposition.voiceProfile?.low || '?')} (${log.transposition.voiceProfile?.lowMidi ?? '?'}) - ${escapeHtml(log.transposition.voiceProfile?.high || '?')} (${log.transposition.voiceProfile?.highMidi ?? '?'})</span>
                <span class="transposition-shift">Shift: ${log.transposition.shift > 0 ? '+' : ''}${log.transposition.shift} semitones</span>
              </div>
              <div class="transposition-row">
                <span class="transposition-notes">${(log.transposition.noteChanges || []).map(c => `${escapeHtml(c.from)} (${c.fromMidi}) → ${escapeHtml(c.to)} (${c.toMidi})`).join(', ')}</span>
              </div>
              ${log.transposition.stretchNotes?.length ? `
              <div class="transposition-row stretch-row">
                <span class="stretch-label">Stretch notes (80¢ tolerance):</span>
                <span class="stretch-notes">${log.transposition.stretchNotes.map(s => `${escapeHtml(s.note)} (${s.midi})`).join(', ')}</span>
              </div>` : ''}
            </div>
          </div>` : ''}
          ${log.err ? `
          <div class="body-section">
            <div class="body-label">Error</div>
            <div class="body-content error-msg">${escapeHtml(log.err.message || JSON.stringify(log.err, null, 2))}</div>
          </div>` : ''}
        </div>`;
      } else {
        return `
        <div class="log-entry level-${log.level}">
          <div class="log-header">
            <span class="level level-${log.level}">${log.level}</span>
            <span class="time">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
          </div>
          <div class="plain-msg">${escapeHtml(log.msg)}</div>
        </div>`;
      }
    }).join('')}
  </div>
  `}
</body>
</html>`;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  // Escape for use in onclick attribute - wrap in JSON to preserve the string
  return JSON.stringify(str).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function renderLoginForm(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logs - Login</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-box {
      background: #1e293b;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #334155;
      width: 100%;
      max-width: 400px;
    }
    h1 { margin: 0 0 24px 0; font-size: 1.5rem; text-align: center; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; font-size: 14px; color: #94a3b8; }
    input[type="email"], input[type="password"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #334155;
      border-radius: 6px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 14px;
    }
    input:focus { outline: none; border-color: #3b82f6; }
    button {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
    }
    button:hover { background: #2563eb; }
    .error {
      background: #ef444420;
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .note { font-size: 12px; color: #64748b; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>Logs Viewer</h1>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/logs/login">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autofocus>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">Login</button>
    </form>
    <p class="note">Admin access required</p>
  </div>
</body>
</html>`;
}

export async function handleLogin(request, reply) {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.type('text/html').send(renderLoginForm('Email and password are required'));
  }

  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    return reply.type('text/html').send(renderLoginForm('Invalid credentials'));
  }

  const isValid = await verifyPassword(user.password_hash, password);
  if (!isValid) {
    return reply.type('text/html').send(renderLoginForm('Invalid credentials'));
  }

  // Check if user is admin
  const { rows } = await db.query('SELECT is_admin FROM users WHERE id = $1', [user.id]);
  if (!rows[0]?.is_admin) {
    return reply.type('text/html').send(renderLoginForm('Admin access required'));
  }

  // Generate access token and set cookie
  const accessToken = signAccessToken({ sub: user.id, email: user.email });

  reply.setCookie('access_token', accessToken, {
    path: '/logs',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return reply.redirect('/logs');
}

export async function handleLogout(request, reply) {
  reply.clearCookie('access_token', { path: '/logs' });
  return reply.redirect('/logs');
}
