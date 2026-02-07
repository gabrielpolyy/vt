import { findUserByEmail } from '../users/repository.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { db } from '../db.js';
import { insertJob } from '../jobs/repository.js';
import { uploadAudioToR2 } from '../utils/r2.js';
import { renderLogin } from './templates/login.js';
import { renderHome } from './templates/home.js';
import { renderHighwayForm } from './templates/highway.js';
import { renderAudioExercises } from './templates/audioExercises.js';
import { renderDocs } from './templates/docs.js';
import {
  getAudioExercisesPaginated,
  getAudioExercisesCount,
  toggleExerciseActive as toggleExerciseActiveRepo,
  updateExerciseLevel as updateExerciseLevelRepo,
  updateExerciseGenre as updateExerciseGenreRepo,
} from '../exercises/repository.js';

export async function getAdminHome(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
  }

  return reply.type('text/html').send(renderHome());
}

export async function getHighwayForm(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
  }

  return reply.type('text/html').send(renderHighwayForm());
}

export async function getAudioExercises(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
  }

  const page = parseInt(request.query.page, 10) || 1;
  const limit = 10;
  const [exercises, totalCount] = await Promise.all([
    getAudioExercisesPaginated(page, limit),
    getAudioExercisesCount(),
  ]);
  const totalPages = Math.ceil(totalCount / limit);

  return reply.type('text/html').send(renderAudioExercises({ exercises, page, totalPages }));
}

export async function submitHighwayJob(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
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
    return reply.type('text/html').send(renderHighwayForm({ error: 'Name is required' }));
  }

  if (!mp3Url && !fileBuffer) {
    return reply.type('text/html').send(renderHighwayForm({ error: 'Either URL or file upload is required' }));
  }

  if (mp3Url && fileBuffer) {
    return reply.type('text/html').send(renderHighwayForm({ error: 'Provide URL or file, not both' }));
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
    return reply.type('text/html').send(renderHighwayForm({ success: true, jobId }));
  } catch (err) {
    return reply.type('text/html').send(renderHighwayForm({ error: `Failed to create job: ${err.message}` }));
  }
}

export async function getDocs(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
  }

  return reply.type('text/html').send(renderDocs());
}

export async function handleLogin(request, reply) {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.type('text/html').send(renderLogin('Email and password are required'));
  }

  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    return reply.type('text/html').send(renderLogin('Invalid credentials'));
  }

  const isValid = await verifyPassword(user.password_hash, password);
  if (!isValid) {
    return reply.type('text/html').send(renderLogin('Invalid credentials'));
  }

  // Check if user is admin
  const { rows } = await db.query('SELECT is_admin FROM users WHERE id = $1', [user.id]);
  if (!rows[0]?.is_admin) {
    return reply.type('text/html').send(renderLogin('Admin access required'));
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

export async function toggleExerciseActive(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
  }

  const { id } = request.params;
  await toggleExerciseActiveRepo(id);

  const page = request.query.page || 1;
  return reply.redirect(`/admin/audio-exercises?page=${page}`);
}

export async function updateExerciseLevel(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
  }

  const { id } = request.params;
  const { level } = request.body;
  const levelNum = level ? parseInt(level, 10) : null;
  await updateExerciseLevelRepo(id, levelNum);

  const page = request.query.page || 1;
  return reply.redirect(`/admin/audio-exercises?page=${page}`);
}

export async function updateExerciseGenre(request, reply) {
  if (request.needsLogin) {
    return reply.type('text/html').send(renderLogin(request.loginError || ''));
  }

  const { id } = request.params;
  const { genre } = request.body;
  const genreValue = genre || null;
  await updateExerciseGenreRepo(id, genreValue);

  const page = request.query.page || 1;
  return reply.redirect(`/admin/audio-exercises?page=${page}`);
}
