import { getCompletedWarmups, getExerciseProgressBySlug, getJourneyDefinition } from './repository.js';
import { getUserProgress, getTotalScore } from '../dashboard/repository.js';
import { getVoiceProfile } from '../voice-profile/repository.js';

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

// GET /api/journey/skill-tree - Get skill tree definition
export async function getSkillTree(request, reply) {
  const journey = await getJourneyDefinition();
  if (!journey) return reply.code(404).send({ error: 'No journey found' });
  return reply.send(journey.definition);
}

// GET /api/journey - Get complete journey/skill tree data
export async function getJourney(request, reply) {
  const userId = request.user.id;
  const userLevel = getUserAccessLevel(request.user);

  // Fetch all data in parallel
  const [progress, score, completedWarmups, exerciseProgressRows, voiceProfile] = await Promise.all([
    getUserProgress(userId),
    getTotalScore(userId),
    getCompletedWarmups(userId),
    getExerciseProgressBySlug(userId),
    getVoiceProfile(userId),
  ]);

  // If voice profile exists, ensure L1N1 is in completedWarmups
  let finalCompletedWarmups = completedWarmups;
  if (voiceProfile) {
    const hasL1N1 = completedWarmups.some((w) => w.level === 1 && w.node === 1);
    if (!hasL1N1) {
      finalCompletedWarmups = [{ level: 1, node: 1 }, ...completedWarmups];
    }
  }

  // Build exercise progress map keyed by slug
  const exerciseProgress = {};
  for (const row of exerciseProgressRows) {
    const maxScore = computeMaxScore(row.definition);
    const stars = computeStars(row.best_score, maxScore);
    exerciseProgress[row.slug] = {
      bestScore: row.best_score ?? 0,
      maxScore,
      stars,
      completed: maxScore === 0 ? row.completed_count > 0 : stars >= 1,
      accessLevel: row.access_level,
      isLocked: !hasAccess(userLevel, row.access_level),
    };
  }

  return reply.send({
    currentLevel: progress.level,
    currentNode: progress.node,
    score,
    completedWarmups: finalCompletedWarmups,
    exerciseProgress,
  });
}
