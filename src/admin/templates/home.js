import { layout } from './layout.js';

export function renderHome() {
  return layout({
    title: 'Admin',
    pageTitle: 'Admin Dashboard',
    content: `
    <div class="grid gap-4">
      <a href="/admin/audio-exercises" class="block bg-brand-surface border border-brand-elevated rounded-xl p-6 no-underline text-inherit transition-colors hover:border-brand-gold">
        <h2 class="text-lg font-semibold m-0 mb-2 text-slate-200">Audio Exercises</h2>
        <p class="text-sm text-slate-400 m-0">Manage audio exercises: toggle status, set level and genre</p>
      </a>
      <a href="/admin/highway" class="block bg-brand-surface border border-brand-elevated rounded-xl p-6 no-underline text-inherit transition-colors hover:border-brand-gold">
        <h2 class="text-lg font-semibold m-0 mb-2 text-slate-200">Highway Generator</h2>
        <p class="text-sm text-slate-400 m-0">Generate highways from audio files</p>
      </a>
      <a href="/admin/logs" class="block bg-brand-surface border border-brand-elevated rounded-xl p-6 no-underline text-inherit transition-colors hover:border-brand-gold">
        <h2 class="text-lg font-semibold m-0 mb-2 text-slate-200">Logs</h2>
        <p class="text-sm text-slate-400 m-0">View application logs and request history</p>
      </a>
    </div>
    `,
  });
}
