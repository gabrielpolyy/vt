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
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/admin.css">
</head>
<body class="font-sans bg-slate-950 text-slate-200 m-0 p-5 min-h-screen">
  <div class="max-w-xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <div class="flex items-center gap-4">
        <a href="/admin" class="text-slate-400 hover:text-slate-200 text-sm no-underline">← Home</a>
        <h1 class="m-0 text-2xl">${escapeHtml(pageTitle)}</h1>
      </div>
      <form method="POST" action="/admin/logout" class="m-0">
        <button type="submit" class="text-slate-400 bg-transparent border-0 cursor-pointer text-sm no-underline hover:text-slate-200">Logout</button>
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
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/admin.css">
</head>
<body class="font-sans bg-slate-950 text-slate-200 m-0 p-5 min-h-screen flex items-center justify-center">
  <div class="bg-slate-800 p-10 rounded-xl border border-slate-700 w-full max-w-md">
    ${error ? `<div class="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-md mb-4 text-sm">${escapeHtml(error)}</div>` : ''}
    ${content}
  </div>
</body>
</html>`;
}
