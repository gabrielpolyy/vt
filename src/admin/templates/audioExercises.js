import { layout, escapeHtml } from './layout.js';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function renderAudioExercises({ exercises, page, totalPages } = {}) {
  let content = '';

  if (!exercises || exercises.length === 0) {
    content = `<p class="text-slate-400 text-sm">No audio exercises found.</p>`;
  } else {
    const cards = exercises.map((ex) => `
      <div class="bg-slate-700/50 rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-medium text-slate-200">${escapeHtml(ex.name)}</h3>
          <span class="px-2 py-1 text-xs rounded-full shrink-0 ${ex.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
            ${ex.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div class="text-xs text-slate-400">${formatDate(ex.created_at)}</div>
        <div class="flex flex-wrap items-center gap-3">
          <form method="POST" action="/admin/audio-exercises/${ex.id}/level?page=${page}" class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Level</span>
            <select name="level" onchange="this.form.submit()" class="px-2 py-1 text-xs rounded-md bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer">
              <option value="">-</option>
              ${[1,2,3,4,5,6,7,8,9,10].map(lvl => `<option value="${lvl}" ${ex.level === lvl ? 'selected' : ''}>${lvl}</option>`).join('')}
            </select>
          </form>
          <form method="POST" action="/admin/audio-exercises/${ex.id}/genre?page=${page}" class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Genre</span>
            <select name="genre" onchange="this.form.submit()" class="px-2 py-1 text-xs rounded-md bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer">
              <option value="">-</option>
              ${['pop', 'rock', 'r&b', 'jazz', 'classical', 'country', 'hip-hop', 'electronic', 'folk', 'theater', 'gospel', 'blues'].map(g => `<option value="${g}" ${ex.genre === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </form>
          <form method="POST" action="/admin/audio-exercises/${ex.id}/toggle?page=${page}">
            <button type="submit" class="px-3 py-1.5 text-xs rounded-md ${ex.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}">
              ${ex.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </form>
        </div>
      </div>
    `).join('');

    const paginationButtons = [];
    if (page > 1) {
      paginationButtons.push(`<a href="/admin/audio-exercises?page=${page - 1}" class="px-3 py-1.5 text-sm bg-brand-elevated text-slate-200 rounded-md hover:bg-brand-gold hover:text-slate-950 transition-colors">Prev</a>`);
    }
    for (let i = 1; i <= totalPages; i++) {
      const isActive = i === page;
      paginationButtons.push(`<a href="/admin/audio-exercises?page=${i}" class="px-3 py-1.5 text-sm rounded-md transition-colors ${isActive ? 'bg-brand-gold text-slate-950' : 'bg-brand-elevated text-slate-200 hover:bg-brand-gold hover:text-slate-950'}">${i}</a>`);
    }
    if (page < totalPages) {
      paginationButtons.push(`<a href="/admin/audio-exercises?page=${page + 1}" class="px-3 py-1.5 text-sm bg-brand-elevated text-slate-200 rounded-md hover:bg-brand-gold hover:text-slate-950 transition-colors">Next</a>`);
    }

    content = `
      <div class="space-y-3">
        ${cards}
      </div>
      ${totalPages > 1 ? `<div class="flex gap-2 mt-4 justify-center">${paginationButtons.join('')}</div>` : ''}
    `;
  }

  return layout({
    title: 'Audio Exercises',
    pageTitle: 'Audio Exercises',
    content: `
    <div class="bg-brand-surface p-4 sm:p-8 rounded-xl border border-brand-elevated">
      ${content}
    </div>
    `,
  });
}
