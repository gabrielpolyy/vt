import { findValidResetToken, executePasswordReset } from './passwordResetRepository.js';
import { hashPassword } from '../utils/password.js';
import { authConfig } from '../config/auth.js';

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageLayout({ title, content, error = '', success = '' }) {
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
    ${success ? `<div class="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded-md mb-4 text-sm">${escapeHtml(success)}</div>` : ''}
    ${content}
  </div>
</body>
</html>`;
}

export async function showResetPasswordForm(request, reply) {
  const { token } = request.query;

  if (!token) {
    return reply.type('text/html').send(pageLayout({
      title: 'Reset Password',
      error: 'Invalid reset link. Please request a new password reset.',
      content: `
        <h1 class="text-2xl font-bold text-center mb-6 text-brand-gold">Reset Password</h1>
        <p class="text-slate-400 text-center">The reset link is invalid or missing.</p>
      `,
    }));
  }

  const resetToken = await findValidResetToken(token);
  if (!resetToken) {
    return reply.type('text/html').send(pageLayout({
      title: 'Reset Password',
      error: 'This reset link has expired or already been used. Please request a new password reset.',
      content: `
        <h1 class="text-2xl font-bold text-center mb-6 text-brand-gold">Reset Password</h1>
        <p class="text-slate-400 text-center">The reset link is no longer valid.</p>
      `,
    }));
  }

  return reply.type('text/html').send(pageLayout({
    title: 'Reset Password',
    content: `
      <h1 class="text-2xl font-bold text-center mb-6 text-brand-gold">Reset Password</h1>
      <p class="text-slate-400 text-center mb-6">Enter your new password below.</p>
      <form method="POST" action="/reset-password">
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <div class="mb-4">
          <label for="password" class="block text-sm text-slate-300 mb-2">New Password</label>
          <input type="password" id="password" name="password" required minlength="${authConfig.password.minLength}"
            class="w-full p-3 bg-brand-bg border border-brand-elevated rounded-lg text-slate-200 focus:border-brand-gold focus:outline-none">
        </div>
        <div class="mb-6">
          <label for="confirmPassword" class="block text-sm text-slate-300 mb-2">Confirm Password</label>
          <input type="password" id="confirmPassword" name="confirmPassword" required minlength="${authConfig.password.minLength}"
            class="w-full p-3 bg-brand-bg border border-brand-elevated rounded-lg text-slate-200 focus:border-brand-gold focus:outline-none">
        </div>
        <button type="submit"
          class="w-full p-3 bg-brand-gold text-brand-bg font-semibold rounded-lg hover:bg-amber-400 transition-colors">
          Reset Password
        </button>
      </form>
      <script>
        document.querySelector('form').addEventListener('submit', function(e) {
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          if (password !== confirmPassword) {
            e.preventDefault();
            alert('Passwords do not match');
          }
        });
      </script>
    `,
  }));
}

export async function handleResetPasswordForm(request, reply) {
  const { token, password, confirmPassword } = request.body;

  if (!token || !password) {
    return reply.type('text/html').send(pageLayout({
      title: 'Reset Password',
      error: 'Missing required fields.',
      content: `<p class="text-slate-400 text-center">Please try again with a valid reset link.</p>`,
    }));
  }

  if (password !== confirmPassword) {
    return reply.type('text/html').send(pageLayout({
      title: 'Reset Password',
      error: 'Passwords do not match.',
      content: `
        <h1 class="text-2xl font-bold text-center mb-6 text-brand-gold">Reset Password</h1>
        <p class="text-slate-400 text-center mb-4">Please go back and try again.</p>
        <a href="/reset-password?token=${escapeHtml(token)}" class="block text-center text-brand-gold hover:underline">Try again</a>
      `,
    }));
  }

  if (password.length < authConfig.password.minLength) {
    return reply.type('text/html').send(pageLayout({
      title: 'Reset Password',
      error: `Password must be at least ${authConfig.password.minLength} characters.`,
      content: `
        <h1 class="text-2xl font-bold text-center mb-6 text-brand-gold">Reset Password</h1>
        <p class="text-slate-400 text-center mb-4">Please go back and try again with a longer password.</p>
        <a href="/reset-password?token=${escapeHtml(token)}" class="block text-center text-brand-gold hover:underline">Try again</a>
      `,
    }));
  }

  const passwordHash = await hashPassword(password);
  const result = await executePasswordReset(token, passwordHash);

  if (!result) {
    return reply.type('text/html').send(pageLayout({
      title: 'Reset Password',
      error: 'This reset link has expired or already been used.',
      content: `
        <h1 class="text-2xl font-bold text-center mb-6 text-brand-gold">Reset Password</h1>
        <p class="text-slate-400 text-center">Please request a new password reset.</p>
      `,
    }));
  }

  return reply.type('text/html').send(pageLayout({
    title: 'Password Reset Complete',
    success: 'Your password has been reset successfully!',
    content: `
      <h1 class="text-2xl font-bold text-center mb-6 text-brand-gold">Success!</h1>
      <p class="text-slate-400 text-center mb-4">Your password has been updated. You can now log in with your new password.</p>
      <p class="text-slate-500 text-center text-sm">You may close this page.</p>
    `,
  }));
}
