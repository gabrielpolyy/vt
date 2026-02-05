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
  const { sources = [], categories = [], currentLevel, currentSearch, currentSource, currentCategory, currentLimit = 500, message } = options;
  const levels = ['info', 'warn', 'error'];

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

    // Auto-refresh filters
    function updateFilter(name, value) {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set(name, value);
      else params.delete(name);
      window.location.search = params.toString();
    }

    // Debounced search (300ms)
    let searchTimeout;
    function debounceSearch(value) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => updateFilter('search', value), 300);
    }
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

  <div class="flex gap-2.5 mb-5 flex-wrap">
    <select onchange="updateFilter('level', this.value)" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm cursor-pointer">
      <option value="">All Levels</option>
      ${levels.map(l => `<option value="${l}" ${currentLevel === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
    </select>

    ${sources.length > 0 ? `
    <select onchange="updateFilter('source', this.value)" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm cursor-pointer">
      <option value="">All Sources</option>
      ${sources.map(s => `<option value="${s}" ${currentSource === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
    ` : ''}

    <select onchange="updateFilter('category', this.value)" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm cursor-pointer">
      <option value="">All Categories</option>
      ${categories.map(c => `<option value="${c.key}" ${currentCategory === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}
    </select>

    <input type="text" placeholder="Search logs..." value="${currentSearch || ''}" oninput="debounceSearch(this.value)" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm min-w-[200px]">
    <select onchange="updateFilter('limit', this.value)" class="px-3 py-2 border border-brand-elevated rounded-md bg-brand-surface text-slate-200 text-sm cursor-pointer">
      ${[100, 250, 500, 1000].map(n => `<option value="${n}" ${parseInt(currentLimit) === n ? 'selected' : ''}>${n}</option>`).join('')}
    </select>
  </div>

  ${message ? `<div class="bg-brand-surface p-5 rounded-lg border border-brand-elevated"><p>${message}</p><p>App name: ${options.appName}</p><p>Log dir: ${options.logDir}</p></div>` : `
  <div class="flex flex-col gap-2">
    ${logs.map(log => renderLogEntry(log)).join('')}
  </div>
  `}
</body>
</html>`;
}

// Event category colors
const EVENT_COLORS = {
  'auth.': { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-l-violet-500' },
  'subscription.': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-l-emerald-500' },
  'email.': { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-l-sky-500' },
};

function getEventColors(event) {
  if (!event) return null;
  for (const [prefix, colors] of Object.entries(EVENT_COLORS)) {
    if (event.startsWith(prefix)) return colors;
  }
  return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-l-slate-500' };
}

function renderLogEntry(log) {
  const isRequest = log.method && log.url;
  const isEvent = log.event;
  const isMobile = log.screen; // Mobile logs have screen field
  const level = log.level || 'info';
  const levelColors = LEVEL_COLORS[level] || LEVEL_COLORS.info;

  if (isMobile) {
    // Mobile app logs - orange theme
    return `
    <div class="bg-brand-surface rounded-lg p-3 px-4 border-l-[3px] border-l-orange-500">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${levelColors.bg} ${levelColors.text}">${level}</span>
        <span class="font-semibold text-base px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">📱 ${escapeHtml(log.screen)}</span>
        <span class="text-slate-400 text-xs">${escapeHtml(log.device)} · ${escapeHtml(log.os)} · v${escapeHtml(log.app)}</span>
        <span class="text-slate-500 text-xs font-mono ml-auto">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
      </div>
      <div class="mt-2 text-orange-300 text-sm">${escapeHtml(log.msg)}</div>
      ${log.stack ? `<div class="mt-1 text-orange-400/70 text-xs font-mono whitespace-pre-wrap">${escapeHtml(log.stack)}</div>` : ''}
    </div>`;
  } else if (isEvent) {
    // Business event logs (auth, subscription, email) - prominent display
    const eventColors = getEventColors(log.event);
    return `
    <div class="bg-brand-surface rounded-lg p-3 px-4 border-l-[3px] ${eventColors.border}">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${levelColors.bg} ${levelColors.text}">${level}</span>
        <span class="font-mono font-semibold text-base px-2 py-0.5 rounded ${eventColors.bg} ${eventColors.text}">${escapeHtml(log.event)}</span>
        ${log.userId ? `<span class="text-slate-400 text-xs">userId: <span class="font-mono">${escapeHtml(log.userId)}</span></span>` : ''}
        <span class="text-slate-500 text-xs font-mono ml-auto">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
      </div>
    </div>`;
  } else if (isRequest) {
    // HTTP request logs - show errors inline
    const isError = log.status >= 500;
    const statusClass = isError ? 'bg-red-500/20 text-red-400' : log.status >= 400 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400';
    const borderClass = isError ? 'border-l-red-500' : levelColors.border;

    return `
    <div class="bg-brand-surface rounded-lg p-3 px-4 border-l-[3px] ${borderClass}">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${levelColors.bg} ${levelColors.text}">${level}</span>
        <span class="font-mono font-bold px-1.5 py-0.5 rounded ${statusClass}">${log.status}</span>
        <span class="font-semibold text-slate-300">${log.method}</span>
        <span class="text-slate-400 font-mono text-sm">${escapeHtml(log.url)}</span>
        <span class="text-slate-500 text-xs">${log.ms}ms</span>
        ${log.userId ? `<span class="text-slate-500 text-xs">userId: <span class="font-mono">${escapeHtml(log.userId)}</span></span>` : ''}
        <span class="text-slate-500 text-xs font-mono ml-auto">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
      </div>
      ${log.err ? `<div class="mt-2 text-red-400 text-sm font-mono">${escapeHtml(log.err.message || JSON.stringify(log.err))}</div>` : ''}
    </div>`;
  } else {
    // Generic logs - de-emphasized
    return `
    <div class="bg-brand-surface/50 rounded-lg p-2.5 px-4 border-l-[3px] border-l-slate-600">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${levelColors.bg} ${levelColors.text}">${level}</span>
        <span class="text-slate-500 text-xs font-mono">${log.time ? new Date(log.time).toLocaleString() : ''}</span>
        <span class="text-slate-400 text-sm">${escapeHtml(log.msg)}</span>
      </div>
    </div>`;
  }
}
