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

function renderExercisesTable(exercises, page, totalPages) {
  if (!exercises || exercises.length === 0) {
    return `
    <div class="bg-slate-800 p-8 rounded-xl border border-slate-700 mt-8">
      <h2 class="text-lg font-semibold text-slate-200 mb-4">Audio Exercises</h2>
      <p class="text-slate-400 text-sm">No audio exercises found.</p>
    </div>`;
  }

  const rows = exercises.map((ex) => `
    <tr class="border-b border-slate-700">
      <td class="py-3 px-4 text-sm text-slate-200">${escapeHtml(ex.name)}</td>
      <td class="py-3 px-4 text-sm text-slate-400">${formatDate(ex.created_at)}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-1 text-xs rounded-full ${ex.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
          ${ex.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="py-3 px-4">
        <form method="POST" action="/admin/highway/${ex.id}/toggle?page=${page}" class="inline">
          <button type="submit" class="px-3 py-1.5 text-xs rounded-md ${ex.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}">
            ${ex.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </form>
      </td>
    </tr>
  `).join('');

  const paginationButtons = [];
  if (page > 1) {
    paginationButtons.push(`<a href="/admin/highway?page=${page - 1}" class="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600">Prev</a>`);
  }
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === page;
    paginationButtons.push(`<a href="/admin/highway?page=${i}" class="px-3 py-1.5 text-sm rounded-md ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}">${i}</a>`);
  }
  if (page < totalPages) {
    paginationButtons.push(`<a href="/admin/highway?page=${page + 1}" class="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600">Next</a>`);
  }

  return `
  <div class="bg-slate-800 p-8 rounded-xl border border-slate-700 mt-8">
    <h2 class="text-lg font-semibold text-slate-200 mb-4">Audio Exercises</h2>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-600">
            <th class="py-3 px-4 text-left text-sm font-medium text-slate-400">Name</th>
            <th class="py-3 px-4 text-left text-sm font-medium text-slate-400">Created</th>
            <th class="py-3 px-4 text-left text-sm font-medium text-slate-400">Status</th>
            <th class="py-3 px-4 text-left text-sm font-medium text-slate-400">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    ${totalPages > 1 ? `<div class="flex gap-2 mt-4 justify-center">${paginationButtons.join('')}</div>` : ''}
  </div>`;
}

export function renderHighwayForm({ success, error, jobId, exercises, page, totalPages } = {}) {
  const successMsg = success
    ? `<div class="bg-green-500/10 border border-green-500 text-green-500 p-4 rounded-md mb-5 text-sm"><strong class="font-semibold">Job created successfully!</strong><br>Job ID: ${escapeHtml(String(jobId))}</div>`
    : '';
  const errorMsg = error ? `<div class="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md mb-5 text-sm">${escapeHtml(error)}</div>` : '';

  return layout({
    title: 'Highway Generator',
    pageTitle: 'Highway Generator',
    content: `
    <div class="bg-slate-800 p-8 rounded-xl border border-slate-700">
      ${successMsg}
      ${errorMsg}

      <form method="POST" action="/admin/highway" enctype="multipart/form-data" id="highwayForm">
        <div class="mb-5">
          <label for="name" class="block mb-2 text-sm text-slate-400 font-medium">Name *</label>
          <input type="text" id="name" name="name" required placeholder="Enter highway name"
            class="w-full p-3 border border-slate-700 rounded-md bg-slate-950 text-slate-200 text-sm focus:outline-none focus:border-blue-500">
          <div class="text-xs text-slate-500 mt-1.5">A descriptive name for this highway</div>
        </div>

        <div class="mb-5">
          <label for="url" class="block mb-2 text-sm text-slate-400 font-medium">Audio URL</label>
          <input type="url" id="url" name="url" placeholder="https://example.com/audio.mp3"
            class="w-full p-3 border border-slate-700 rounded-md bg-slate-950 text-slate-200 text-sm focus:outline-none focus:border-blue-500">
          <div class="text-xs text-slate-500 mt-1.5">Direct URL to an MP3 file</div>
        </div>

        <div class="divider-or">OR</div>

        <div class="mb-5">
          <label for="file" class="block mb-2 text-sm text-slate-400 font-medium">Upload Audio File</label>
          <input type="file" id="file" name="file" accept="audio/*"
            class="file-input w-full p-3 border border-slate-700 rounded-md bg-slate-950 text-slate-200 text-sm">
          <div class="text-xs text-slate-500 mt-1.5">Upload an audio file (MP3, WAV, etc.)</div>
        </div>

        <button type="submit" id="submitBtn"
          class="w-full p-3.5 bg-blue-500 border-0 rounded-md text-white text-sm font-semibold cursor-pointer hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed">Generate Highway</button>
      </form>
    </div>

    ${renderExercisesTable(exercises, page, totalPages)}

    <script>
      const form = document.getElementById('highwayForm');
      const urlInput = document.getElementById('url');
      const fileInput = document.getElementById('file');
      const submitBtn = document.getElementById('submitBtn');

      fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
          urlInput.value = '';
        }
      });

      urlInput.addEventListener('input', () => {
        if (urlInput.value) {
          fileInput.value = '';
        }
      });

      form.addEventListener('submit', () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      });
    </script>
    `,
  });
}
