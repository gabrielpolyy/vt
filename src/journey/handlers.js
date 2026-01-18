import { getCompletedWarmups, getExerciseProgressBySlug } from './repository.js';
import { getUserProgress, getTotalScore } from '../dashboard/repository.js';

// Count total notes in exercise definition
function countNotes(definition) {
  // Regular exercises: count notes in steps
  if (definition.steps) {
    let count = 0;
    for (const step of definition.steps) {
      count += (step.notes || []).length;
    }
    return count;
  }

  // Highway exercises: count voice cues
  if (definition.cues) {
    return definition.cues.filter((cue) => cue.kind === 'voice').length;
  }

  return 0;
}

// Compute maxScore from definition (20 points per note/cue)
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

// GET /api/journey - Get complete journey/skill tree data
export async function getJourney(request, reply) {
  const userId = request.user.id;

  // Fetch all data in parallel
  const [progress, score, completedWarmups, exerciseProgressRows] = await Promise.all([
    getUserProgress(userId),
    getTotalScore(userId),
    getCompletedWarmups(userId),
    getExerciseProgressBySlug(userId),
  ]);

  // Build exercise progress map keyed by slug
  const exerciseProgress = {};
  for (const row of exerciseProgressRows) {
    const maxScore = computeMaxScore(row.definition);
    const stars = computeStars(row.best_score, maxScore);
    exerciseProgress[row.slug] = {
      bestScore: row.best_score,
      maxScore,
      stars,
      completed: stars >= 1,
    };
  }

  return reply.send({
    currentLevel: progress.level,
    currentNode: progress.node,
    score,
    completedWarmups,
    exerciseProgress,
  });
}
