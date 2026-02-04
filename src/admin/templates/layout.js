export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function layout({ title, pageTitle, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - PitchHighway</title>
  <link rel="stylesheet" href="/admin.css">
</head>
<body class="font-sans bg-brand-bg text-slate-200 m-0 p-5 min-h-screen">
  <div class="max-w-xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div class="flex items-center gap-4">
        <a href="/admin" class="text-slate-400 hover:text-brand-gold text-sm no-underline transition-colors">← Home</a>
        <h1 class="m-0 text-2xl">${escapeHtml(pageTitle)}</h1>
      </div>
      <form method="POST" action="/admin/logout" class="m-0">
        <button type="submit" class="text-slate-400 bg-transparent border-0 cursor-pointer text-sm no-underline hover:text-brand-gold transition-colors">Logout</button>
      </form>
    </div>
    ${content}
  </div>
</body>
</html>`;
}

export function loginLayout({ title, content, error = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - PitchHighway</title>
  <link rel="stylesheet" href="/admin.css">
  <style>
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.4), transparent),
        radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.3), transparent),
        radial-gradient(1px 1px at 45% 8%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1px 1px at 60% 45%, rgba(255,255,255,0.25), transparent),
        radial-gradient(1px 1px at 75% 20%, rgba(255,255,255,0.35), transparent),
        radial-gradient(1px 1px at 85% 60%, rgba(255,255,255,0.4), transparent),
        radial-gradient(1px 1px at 15% 70%, rgba(255,255,255,0.3), transparent),
        radial-gradient(1px 1px at 35% 85%, rgba(255,255,255,0.45), transparent),
        radial-gradient(1px 1px at 55% 65%, rgba(255,255,255,0.2), transparent),
        radial-gradient(1px 1px at 90% 85%, rgba(255,255,255,0.35), transparent);
      pointer-events: none;
      z-index: 0;
    }
  </style>
</head>
<body class="font-sans bg-brand-bg text-slate-200 m-0 p-5 min-h-screen flex items-center justify-center">
  <div class="bg-brand-surface p-10 rounded-xl border border-brand-elevated w-full max-w-md relative z-10">
    ${error ? `<div class="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-md mb-4 text-sm">${escapeHtml(error)}</div>` : ''}
    ${content}
  </div>
</body>
</html>`;
}
