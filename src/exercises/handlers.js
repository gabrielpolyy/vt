import {
  getExerciseBySlug,
  getExercises,
  recordAttempt,
  getAllProgress,
  getExerciseProgress,
  getAttemptHistory,
  toggleFavorite as toggleFavoriteRepo,
} from './repository.js';
import { getVoiceProfile } from '../voice-profile/repository.js';
import { transposeForVoiceProfile, getTranspositionDetails, midiToPitch } from './transposition.js';
import { logTransposition } from '../logging/index.js';
import { getHighwayAudioUrls } from '../utils/r2.js';

// Access level helpers
const ACCESS_HIERARCHY = { guest: 0, registered: 1, premium: 2 };

function getUserAccessLevel(user) {
  if (user.isGuest) return 'guest';
  if (user.tier === 'premium') return 'premium';
  return 'registered';
}

function hasAccess(userLevel, exerciseLevel) {
  return ACCESS_HIERARCHY[userLevel] >= ACCESS_HIERARCHY[exerciseLevel];
}

function getUpgradeReason(user, requiredLevel) {
  if (user.isGuest) return 'account_required';
  return 'premium_required';
}

// GET /api/exercises - List all exercises with access level info
export async function listExercises(request, reply) {
  const { type, category, filterOut } = request.query;
  const userId = request.user.id;
  const userLevel = getUserAccessLevel(request.user);

  const exercises = await getExercises({ type, category, filterOut, userId });

  // Add isLocked field based on user's access level
  const exercisesWithAccess = exercises.map((ex) => ({
    ...ex,
    accessLevel: ex.access_level,
    isLocked: !hasAccess(userLevel, ex.access_level),
  }));

  return reply.send({ exercises: exercisesWithAccess });
}

// GET /api/exercises/:slug - Get exercise by slug
export async function getExercise(request, reply) {
  const { slug } = request.params;
  const userId = request.user.id;
  const userLevel = getUserAccessLevel(request.user);

  const exercise = await getExerciseBySlug(slug);

  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
  }

  // Check access level
  if (!hasAccess(userLevel, exercise.access_level)) {
    return reply.code(403).send({
      error: 'Upgrade required to access this exercise',
      reason: getUpgradeReason(request.user, exercise.access_level),
      requiredLevel: exercise.access_level,
    });
  }

  // Get user's voice profile and transpose exercise
  const voiceProfile = await getVoiceProfile(userId);

  // Attach transposition details for logging
  if (voiceProfile) {
    const { shift, noteChanges, stretchNotes } = getTranspositionDetails(exercise.definition, voiceProfile);
    request.transpositionLog = {
      timestamp: new Date().toISOString(),
      exercise: {
        id: exercise.id,
        slug: exercise.slug,
        name: exercise.name,
        description: exercise.description,
        type: exercise.type,
        category: exercise.category,
      },
      voiceProfile: {
        low: midiToPitch(voiceProfile.lowest_midi),
        lowMidi: voiceProfile.lowest_midi,
        high: midiToPitch(voiceProfile.highest_midi),
        highMidi: voiceProfile.highest_midi,
      },
      shift,
      noteChanges,
      stretchNotes,
    };

    // Log to dedicated transpositions.log file
    logTransposition(request.transpositionLog);
  }

  // Skip transposition for audio exercises - lyrics shouldn't be modified
  const definition = exercise.category === 'audio'
    ? exercise.definition
    : transposeForVoiceProfile(exercise.definition, voiceProfile);

  return reply.send(definition);
}

// Count total notes in exercise definition
function countNotes(definition) {
  let count = 0;
  for (const step of definition.steps || []) {
    count += (step.notes || []).length;
  }
  return count;
}

// Compute maxScore from definition (20 points per note)
function computeMaxScore(definition) {
  return countNotes(definition) * 20;
}

// Compute stars from score/maxScore percentage
function computeStars(score, maxScore) {
  if (score == null || maxScore === 0) return 0;
  const percent = (score / maxScore) * 100;
  if (percent < 60) return 0;
  if (percent < 80) return 1;
  if (percent < 95) return 2;
  return 3;
}

// POST /api/exercises/:slug/attempts - Record an exercise attempt
export async function createAttempt(request, reply) {
  const { slug } = request.params;
  const userId = request.user.id;
  const userLevel = getUserAccessLevel(request.user);
  const { score, completed, result } = request.body;

  if (score == null) {
    return reply.code(400).send({ error: 'score is required' });
  }

  if (score < 0) {
    return reply.code(400).send({ error: 'score must be non-negative' });
  }

  const exercise = await getExerciseBySlug(slug);
  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
  }

  // Check access level
  if (!hasAccess(userLevel, exercise.access_level)) {
    return reply.code(403).send({
      error: 'Upgrade required to access this exercise',
      reason: getUpgradeReason(request.user, exercise.access_level),
      requiredLevel: exercise.access_level,
    });
  }

  const maxScore = computeMaxScore(exercise.definition);

  if (score > maxScore) {
    return reply.code(400).send({ error: `score cannot exceed maxScore (${maxScore})` });
  }

  const attempt = await recordAttempt(userId, exercise.id, {
    score,
    completed: completed ?? true,
    result: result || null,
  });

  const progress = await getExerciseProgress(userId, exercise.id);
  const stars = computeStars(progress.best_score, maxScore);

  return reply.code(201).send({
    attempt: {
      id: attempt.id,
      score: attempt.score,
      maxScore,
      completed: attempt.completed,
      result: attempt.result,
      createdAt: attempt.created_at,
    },
    progress: {
      bestScore: progress.best_score,
      maxScore,
      stars,
      completedCount: progress.completed_count,
      lastPlayedAt: progress.last_played_at,
    },
  });
}

// GET /api/exercises/progress - Get progress for all exercises
export async function listProgress(request, reply) {
  const userId = request.user.id;
  const userLevel = getUserAccessLevel(request.user);

  const allProgress = await getAllProgress(userId);

  // Group by type and compute stars for each
  const progressByType = {};

  for (const row of allProgress) {
    const type = row.type;
    if (!progressByType[type]) {
      progressByType[type] = [];
    }

    const maxScore = computeMaxScore(row.definition);
    const isLocked = !hasAccess(userLevel, row.access_level);

    progressByType[type].push({
      exerciseId: row.exercise_id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      sortOrder: row.sort_order,
      accessLevel: row.access_level,
      isLocked,
      completedCount: row.completed_count,
      bestScore: row.best_score,
      maxScore,
      stars: computeStars(row.best_score, maxScore),
      lastPlayedAt: row.last_played_at,
    });
  }

  // Compute unlock status: first exercise always accessible, subsequent ones need previous to have 1+ star
  // Note: isAccessible is about progression unlock, isLocked is about tier access
  for (const type of Object.keys(progressByType)) {
    const exercises = progressByType[type];
    exercises.sort((a, b) => a.sortOrder - b.sortOrder);

    for (let i = 0; i < exercises.length; i++) {
      exercises[i].isAccessible = i === 0 || exercises[i - 1].stars >= 1;
    }
  }

  return reply.send({ progress: progressByType });
}

// GET /api/exercises/:slug/progress - Get detailed progress for single exercise
export async function getProgressBySlug(request, reply) {
  const { slug } = request.params;
  const userId = request.user.id;
  const userLevel = getUserAccessLevel(request.user);
  const limit = parseInt(request.query.limit) || 10;

  const exercise = await getExerciseBySlug(slug);
  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
  }

  // Check access level
  if (!hasAccess(userLevel, exercise.access_level)) {
    return reply.code(403).send({
      error: 'Upgrade required to access this exercise',
      reason: getUpgradeReason(request.user, exercise.access_level),
      requiredLevel: exercise.access_level,
    });
  }

  const maxScore = computeMaxScore(exercise.definition);

  const [progress, attempts] = await Promise.all([
    getExerciseProgress(userId, exercise.id),
    getAttemptHistory(userId, exercise.id, Math.min(limit, 50)),
  ]);

  const stars = computeStars(progress.best_score, maxScore);

  return reply.send({
    exercise: {
      id: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      type: exercise.type,
      category: exercise.category,
    },
    progress: {
      bestScore: progress.best_score,
      maxScore,
      stars,
      completedCount: progress.completed_count,
      lastPlayedAt: progress.last_played_at,
    },
    attempts: attempts.map((a) => ({
      id: a.id,
      score: a.score,
      maxScore,
      completed: a.completed,
      result: a.result,
      createdAt: a.created_at,
    })),
  });
}

// GET /api/exercises/:slug/audio - Get audio download URLs
export async function getExerciseAudio(request, reply) {
  const { slug } = request.params;
  const userLevel = getUserAccessLevel(request.user);

  const exercise = await getExerciseBySlug(slug);
  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
  }

  // Check access level
  if (!hasAccess(userLevel, exercise.access_level)) {
    return reply.code(403).send({
      error: 'Upgrade required to access this exercise',
      reason: getUpgradeReason(request.user, exercise.access_level),
      requiredLevel: exercise.access_level,
    });
  }

  const trackId = exercise.definition?.trackId;
  if (!trackId) {
    return reply.code(400).send({ error: 'Exercise has no audio track' });
  }

  const { vocalsUrl, backingUrl } = await getHighwayAudioUrls(trackId);
  return reply.send({ vocalsUrl, backingUrl });
}

// POST /api/exercises/:slug/favorite - Toggle favorite status
export async function toggleFavorite(request, reply) {
  const { slug } = request.params;
  const userId = request.user.id;
  const userLevel = getUserAccessLevel(request.user);

  const exercise = await getExerciseBySlug(slug);
  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
  }

  // Check access level - users can only favorite exercises they have access to
  if (!hasAccess(userLevel, exercise.access_level)) {
    return reply.code(403).send({
      error: 'Upgrade required to access this exercise',
      reason: getUpgradeReason(request.user, exercise.access_level),
      requiredLevel: exercise.access_level,
    });
  }

  const { isFavorite } = await toggleFavoriteRepo(userId, exercise.id);

  return reply.send({
    exerciseId: exercise.id,
    isFavorite,
  });
}

