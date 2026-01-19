import { findUserByEmail } from '../users/repository.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { db } from '../db.js';
import { insertJob } from '../jobs/repository.js';
import { uploadAudioToR2 } from '../utils/r2.js';

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAdminHome() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    h1 { margin: 0; font-size: 1.5rem; }
    .logout {
      color: #94a3b8;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }
    .logout:hover { color: #e2e8f0; }
    .tools {
      display: grid;
      gap: 16px;
    }
    .tool-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.2s, background 0.2s;
    }
    .tool-card:hover {
      border-color: #3b82f6;
      background: #1e293b;
    }
    .tool-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #e2e8f0;
    }
    .tool-desc {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Admin</h1>
      <form method="POST" action="/admin/logout" style="margin:0">
        <button type="submit" class="logout">Logout</button>
      </form>
    </div>
    <div class="tools">
      <a href="/admin/logs" class="tool-card">
        <h2 class="tool-title">Logs</h2>
        <p class="tool-desc">View application logs and request history</p>
      </a>
      <a href="/admin/highway" class="tool-card">
        <h2 class="tool-title">Highway Generator</h2>
        <p class="tool-desc">Generate highways from audio files</p>
      </a>
    </div>
  </div>
</body>
</html>`;
}

function renderLoginForm(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Login</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-box {
      background: #1e293b;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #334155;
      width: 100%;
      max-width: 400px;
    }
    h1 { margin: 0 0 24px 0; font-size: 1.5rem; text-align: center; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; font-size: 14px; color: #94a3b8; }
    input[type="email"], input[type="password"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #334155;
      border-radius: 6px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 14px;
    }
    input:focus { outline: none; border-color: #3b82f6; }
    button {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
    }
    button:hover { background: #2563eb; }
    .error {
      background: #ef444420;
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .note { font-size: 12px; color: #64748b; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>Admin</h1>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/admin/login">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autofocus>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit">Login</button>
    </form>
    <p class="note">Admin access required</p>
  </div>
</body>
</html>`;
}

function renderForm(options = {}) {
  const { success, error, jobId } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Highway Generator</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    h1 { margin: 0; font-size: 1.5rem; }
    .logout {
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      background: none;
      border: none;
      cursor: pointer;
    }
    .logout:hover { color: #e2e8f0; }
    .form-box {
      background: #1e293b;
      padding: 30px;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .form-group { margin-bottom: 20px; }
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #94a3b8;
      font-weight: 500;
    }
    input[type="text"], input[type="url"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #334155;
      border-radius: 6px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 14px;
    }
    input[type="file"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #334155;
      border-radius: 6px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 14px;
    }
    input[type="file"]::file-selector-button {
      background: #334155;
      border: none;
      color: #e2e8f0;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 12px;
    }
    input[type="file"]::file-selector-button:hover {
      background: #475569;
    }
    input:focus { outline: none; border-color: #3b82f6; }
    .divider {
      text-align: center;
      color: #64748b;
      font-size: 12px;
      margin: 20px 0;
      position: relative;
    }
    .divider::before, .divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 45%;
      height: 1px;
      background: #334155;
    }
    .divider::before { left: 0; }
    .divider::after { right: 0; }
    button[type="submit"] {
      width: 100%;
      padding: 14px;
      background: #3b82f6;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button[type="submit"]:hover { background: #2563eb; }
    button[type="submit"]:disabled {
      background: #334155;
      cursor: not-allowed;
    }
    .success {
      background: #22c55e20;
      border: 1px solid #22c55e;
      color: #22c55e;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .success strong { font-weight: 600; }
    .error {
      background: #ef444420;
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .hint {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Highway Generator</h1>
      <form method="POST" action="/admin/logout" style="margin:0">
        <button type="submit" class="logout">Logout</button>
      </form>
    </div>

    <div class="form-box">
      ${success ? `<div class="success"><strong>Job created successfully!</strong><br>Job ID: ${escapeHtml(String(jobId))}</div>` : ''}
      ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}

      <form method="POST" action="/admin/highway" enctype="multipart/form-data" id="highwayForm">
        <div class="form-group">
          <label for="name">Name *</label>
          <input type="text" id="name" name="name" required placeholder="Enter highway name">
          <div class="hint">A descriptive name for this highway</div>
        </div>

        <div class="form-group">
          <label for="url">Audio URL</label>
          <input type="url" id="url" name="url" placeholder="https://example.com/audio.mp3">
          <div class="hint">Direct URL to an MP3 file</div>
        </div>

        <div class="divider">OR</div>

        <div class="form-group">
          <label for="file">Upload Audio File</label>
          <input type="file" id="file" name="file" accept="audio/*">
          <div class="hint">Upload an audio file (MP3, WAV, etc.)</div>
        </div>

        <button type="submit" id="submitBtn">Generate Highway</button>
      </form>
    </div>
  </div>

  <script>
    const form = document.getElementById('highwayForm');
    const urlInput = document.getElementById('url');
    const fileInput = document.getElementById('file');
    const submitBtn = document.getElementById('submitBtn');

    // Clear URL when file is selected and vice versa
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
</body>
</html>`;
}

export async function getAdminHome(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLoginForm(request.loginError || ''));
  }

  return reply.type('text/html').send(renderAdminHome());
}

export async function getHighwayForm(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLoginForm(request.loginError || ''));
  }

  return reply.type('text/html').send(renderForm());
}

export async function submitHighwayJob(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLoginForm(request.loginError || ''));
  }

  let mp3Url = null;
  let name = null;
  let fileBuffer = null;
  let filename = null;

  const parts = request.parts();
  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'file') {
      const buffer = await part.toBuffer();
      if (buffer.length > 0) {
        fileBuffer = buffer;
        filename = part.filename;
      }
    } else if (part.fieldname === 'name') {
      name = part.value;
    } else if (part.fieldname === 'url') {
      if (part.value) {
        mp3Url = part.value;
      }
    }
  }

  if (!name) {
    return reply.type('text/html').send(renderForm({ error: 'Name is required' }));
  }

  if (!mp3Url && !fileBuffer) {
    return reply.type('text/html').send(renderForm({ error: 'Either URL or file upload is required' }));
  }

  if (mp3Url && fileBuffer) {
    return reply.type('text/html').send(renderForm({ error: 'Provide URL or file, not both' }));
  }

  try {
    if (fileBuffer) {
      mp3Url = await uploadAudioToR2(fileBuffer, filename, 'admin');
    }

    const payload = {
      type: 'generate_highway',
      mp3_url: mp3Url,
      name,
      user_id: null,
      description: null,
      sort_order: 0,
      download_max_retries: 3,
      transcription_method: 'gpt4o-ctc',
      pitch_model: 'medium',
      step_size: 10,
      fmin: 60.0,
      fmax: 700.0,
      pitch_min_confidence: 0.3,
      pitch_confidence_threshold: 0.3,
      viterbi: true,
      min_pause_duration_ms: 100,
    };

    const jobId = await insertJob(payload);
    return reply.type('text/html').send(renderForm({ success: true, jobId }));
  } catch (err) {
    return reply.type('text/html').send(renderForm({ error: `Failed to create job: ${err.message}` }));
  }
}

export async function handleLogin(request, reply) {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.type('text/html').send(renderLoginForm('Email and password are required'));
  }

  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    return reply.type('text/html').send(renderLoginForm('Invalid credentials'));
  }

  const isValid = await verifyPassword(user.password_hash, password);
  if (!isValid) {
    return reply.type('text/html').send(renderLoginForm('Invalid credentials'));
  }

  // Check if user is admin
  const { rows } = await db.query('SELECT is_admin FROM users WHERE id = $1', [user.id]);
  if (!rows[0]?.is_admin) {
    return reply.type('text/html').send(renderLoginForm('Admin access required'));
  }

  // Generate access token and set cookie
  const accessToken = signAccessToken({ sub: user.id, email: user.email });

  reply.setCookie('access_token', accessToken, {
    path: '/admin',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return reply.redirect('/admin');
}

export async function handleLogout(request, reply) {
  reply.clearCookie('access_token', { path: '/admin' });
  return reply.redirect('/admin');
}
