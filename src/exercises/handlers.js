import {
  getExerciseBySlug,
  getAllExercises,
  getExercisesByType,
  recordAttempt,
  getAllProgress,
  getExerciseProgress,
  getAttemptHistory,
} from './repository.js';
import { getVoiceProfile } from '../voice-profile/repository.js';
import { transposeForVoiceProfile, getTranspositionDetails, midiToPitch } from './transposition.js';
import { logTransposition } from '../logging/index.js';

// GET /api/exercises - List all exercises
export async function listExercises(request, reply) {
  const { type } = request.query;

  const exercises = type
    ? await getExercisesByType(type)
    : await getAllExercises();

  return reply.send({ exercises });
}

// GET /api/exercises/:slug - Get exercise by slug
export async function getExercise(request, reply) {
  const { slug } = request.params;
  const userId = request.user.id;

  const exercise = await getExerciseBySlug(slug);

  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
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

  const definition = transposeForVoiceProfile(exercise.definition, voiceProfile);

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

  const allProgress = await getAllProgress(userId);

  // Group by type and compute stars for each
  const progressByType = {};

  for (const row of allProgress) {
    const type = row.type;
    if (!progressByType[type]) {
      progressByType[type] = [];
    }

    const maxScore = computeMaxScore(row.definition);

    progressByType[type].push({
      exerciseId: row.exercise_id,
      slug: row.slug,
      name: row.name,
      sortOrder: row.sort_order,
      completedCount: row.completed_count,
      bestScore: row.best_score,
      maxScore,
      stars: computeStars(row.best_score, maxScore),
      lastPlayedAt: row.last_played_at,
    });
  }

  // Compute unlock status: first exercise always accessible, subsequent ones need previous to have 1+ star
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
  const limit = parseInt(request.query.limit) || 10;

  const exercise = await getExerciseBySlug(slug);
  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
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
