import { layout } from './layout.js';

export function renderHome() {
  return layout({
    title: 'Admin',
    pageTitle: 'Admin',
    content: `
    <div class="grid gap-4">
      <a href="/admin/logs" class="block bg-slate-800 border border-slate-700 rounded-xl p-6 no-underline text-inherit transition-colors hover:border-blue-500">
        <h2 class="text-lg font-semibold m-0 mb-2 text-slate-200">Logs</h2>
        <p class="text-sm text-slate-400 m-0">View application logs and request history</p>
      </a>
      <a href="/admin/highway" class="block bg-slate-800 border border-slate-700 rounded-xl p-6 no-underline text-inherit transition-colors hover:border-blue-500">
        <h2 class="text-lg font-semibold m-0 mb-2 text-slate-200">Highway Generator</h2>
        <p class="text-sm text-slate-400 m-0">Generate highways from audio files</p>
      </a>
    </div>
    `,
  });
}
