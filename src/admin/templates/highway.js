import { layout, escapeHtml } from './layout.js';

export function renderHighwayForm({ success, error, jobId } = {}) {
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
