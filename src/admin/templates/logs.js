import { loginLayout, escapeHtml } from './layout.js';

const LEVEL_COLORS = {
  trace: { bg: 'bg-gray-500/20', text: 'text-gray-500', border: 'border-l-gray-500' },
  debug: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-l-blue-500' },
  info: { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-l-green-500' },
  warn: { bg: 'bg-amber-500/20', text: 'text-amber-500', border: 'border-l-amber-500' },
  error: { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-l-red-500' },
  fatal: { bg: 'bg-red-600/20', text: 'text-red-600', border: 'border-l-red-600' },
};

export function renderLogsLogin(error = '') {
  return loginLayout({
    title: 'Logs Login',
    error,
    content: `
    <div class="text-center mb-6">
      <h1 class="m-0 text-2xl"><span class="text-white">Pitch</span><span class="text-brand-gold">Highway</span></h1>
      <p class="text-slate-500 text-sm mt-1">Logs Viewer</p>
    </div>
    <form method="POST" action="/admin/login">
      <div class="mb-4">
        <label for="email" class="block mb-1.5 text-sm text-slate-400">Email</label>
        <input type="email" id="email" name="email" required autofocus
          class="w-full p-3 border border-brand-elevated rounded-md bg-brand-bg text-slate-200 text-sm focus:outline-none focus:border-brand-gold transition-colors">
      </div>
      <div class="mb-4">
        <label for="password" class="block mb-1.5 text-sm text-slate-400">Password</label>
        <input type="password" id="password" name="password" required
          class="w-full p-3 border border-brand-elevated rounded-md bg-brand-bg text-slate-200 text-sm focus:outline-none focus:border-brand-gold transition-colors">
      </div>
      <button type="submit" class="w-full p-3 bg-brand-gold border-0 rounded-md text-slate-950 text-sm font-semibold cursor-pointer mt-2 hover:bg-brand-gold-hover transition-colors">Login</button>
    </form>
    <p class="text-xs text-slate-500 text-center mt-4">Admin access required</p>
    `,
  });
}

export function renderLogs(logs, options = {}) {
  const { sources = [], routes = [], currentLevel, currentSearch, currentSource, currentRoute, currentLimit = 500, message } = options;
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logs Viewer - PitchHighway</title>
  <link rel="stylesheet" href="/admin.css">
</head>
<body class="font-sans bg-brand-bg text-slate-200 m-0 p-5">
  <!-- Modal -->
  <div class="hidden fixed inset-0 bg-black/80 z-50 p-5" id="modal" onclick="if(event.target===this)closeModal()">
    <div class="bg-brand-surface rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col m-auto">
      <div class="flex justify-between items-center px-5 py-4 border-b border-brand-elevated">
        <span class="font-semibold text-sm uppercase text-slate-400" id="modal-title">Body</span>
        <div class="flex gap-3 items-center">
          <button class="bg-brand-elevated border-0 text-slate-200 px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-brand-gold hover:text-slate-950 transition-colors" id="modal-copy" onclick="copyContent()">Copy</button>
          <button class="bg-transparent border-0 text-slate-400 text-2xl cursor-pointer p-0 leading-none hover:text-brand-gold transition-colors" onclick="closeModal()">&times;</button>
        </div>
      </div>
      <div class="p-5 overflow-auto flex-1">
        <pre class="m-0 font-mono text-sm whitespace-pre-wrap break-all leading-relaxed" id="modal-body"></pre>
      </div>
    </div>
  </div>

  <script>
    function openModal(title, content) {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').textContent = content;
      document.getElementById('modal').classList.remove('hidden');
      document.getElementById('modal').classList.add('flex');
      document.getElementById('modal-copy').classList.remove('bg-green-500');
      document.getElementById('modal-copy').textContent = 'Copy';
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      document.getElementById('modal').classList.add('hidden');
      document.getElementById('modal').classList.remove('flex');
      document.body.style.overflow = '';
    }
    function copyContent() {
      const content = document.getElementById('modal-body').textContent;
      navigator.clipboard.writeText(content).then(() => {
        const btn = document.getElementById('modal-copy');
        btn.textContent = 'Copied!';
        btn.classList.add('bg-green-500');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('bg-green-500');
        }, 2000);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    document.addEventListener('click', (e) => {
      const body = e.target.closest('.body-expandable');
      if (body) {
        const title = body.previousElementSibling?.textContent || 'Details';
        const content = body.textContent.replace('Click to expand', '').trim();
        openModal(title, content);
      }
    });
  </script>

  <div class="flex justify-between items-center mb-5">
    <div class="flex items-center gap-4">
      <a href="/admin" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">← Home</a>
      <h1 class="m-0 text-2xl flex items-center gap-2.5">Logs Viewer <span class="text-slate-500 text-sm">${logs.length} entries</span></h1>
    </div>
    <form method="POST" action="/admin/logout" class="m-0">
      <button type="submit" class="text-slate-400 no-underline text-sm bg-transparent border-0 cursor-pointer hover:text-brand-gold transition-colors">Logout</button>
    </form>
  </div>

  <form class="flex gap-2.5 mb-5 flex-wrap" method="GET">
    <select name="level" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm">
      <option value="">All Levels</option>
      ${levels.map(l => `<option value="${l}" ${currentLevel === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
    </select>

    ${sources.length > 0 ? `
    <select name="source" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm">
      <option value="">All Sources</option>
      ${sources.map(s => `<option value="${s}" ${currentSource === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
    ` : ''}

    <select name="route" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm">
      <option value="">All Routes</option>
      ${routes.map(r => `<option value="${r}" ${currentRoute === r ? 'selected' : ''}>${r}</option>`).join('')}
    </select>

    <input type="text" name="search" placeholder="Search logs..." value="${currentSearch || ''}" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm">
    <input type="number" name="limit" placeholder="Limit" value="${currentLimit}" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm w-20">
    <button type="submit" class="px-3 py-2 bg-brand-gold border-brand-gold border rounded-md text-slate-950 text-sm font-semibold cursor-pointer hover:bg-brand-gold-hover transition-colors">Filter</button>
  </form>

  ${message ? `<div class="bg-brand-surface p-5 rounded-lg border border-brand-elevated"><p>${message}</p><p>App name: ${options.appName}</p><p>Log dir: ${options.logDir}</p></div>` : `
  <div class="flex flex-col gap-2">
    ${logs.map(log => renderLogEntry(log)).join('')}
  </div>
  `}
</body>
</html>`;
}

function renderLogEntry(log) {
  const isRequest = log.method && log.url;
  const isEvent = log.event;
  const level = log.level || 'info';
  const colors = LEVEL_COLORS[level] || LEVEL_COLORS.info;
  const statusClass = log.status >= 500 ? 'bg-red-500/20 text-red-500' : log.status >= 400 ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500';

  if (isRequest) {
    // Server error logs (5xx)
    return `
    <div class="bg-brand-surface rounded-lg p-3 px-4 border-l-[3px] ${colors.border}">
      <div class="flex items-center gap-3 mb-2 flex-wrap">
        <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${colors.bg} ${colors.text}">${level}</span>
        <span class="font-mono font-semibold px-1.5 py-0.5 rounded ${statusClass}">${log.status}</span>
        <span class="font-semibold text-violet-400">${log.method}</span>
        <span class="text-slate-200 font-mono">${escapeHtml(log.url)}</span>
        <span class="text-slate-500 text-xs">${log.ms}ms</span>
        <span class="text-slate-500 text-xs font-mono">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
      </div>
      ${log.userId ? `<div class="text-xs text-slate-400 mt-1">User: ${escapeHtml(log.userId)}</div>` : ''}
      ${log.err ? `
      <div class="mt-2.5">
        <div class="text-[11px] text-slate-500 mb-1 uppercase">Error</div>
        <div class="body-expandable text-red-500">${escapeHtml(log.err.message || JSON.stringify(log.err, null, 2))}</div>
      </div>` : ''}
    </div>`;
  } else if (isEvent) {
    // Business event logs (auth, subscription, email)
    return `
    <div class="bg-brand-surface rounded-lg p-3 px-4 border-l-[3px] ${colors.border}">
      <div class="flex items-center gap-3 mb-2 flex-wrap">
        <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${colors.bg} ${colors.text}">${level}</span>
        <span class="font-mono font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">${escapeHtml(log.event)}</span>
        ${log.userId ? `<span class="text-slate-400 text-xs">User: ${escapeHtml(log.userId)}</span>` : ''}
        <span class="text-slate-500 text-xs font-mono">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
      </div>
    </div>`;
  } else {
    // Generic logs
    return `
    <div class="bg-brand-surface rounded-lg p-3 px-4 border-l-[3px] ${colors.border}">
      <div class="flex items-center gap-3 mb-2 flex-wrap">
        <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${colors.bg} ${colors.text}">${level}</span>
        <span class="text-slate-500 text-xs font-mono">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
      </div>
      <div class="text-slate-200 py-1">${escapeHtml(log.msg)}</div>
    </div>`;
  }
}
