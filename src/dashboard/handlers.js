import {
  getCurrentStreak,
  getWeeklyActivity,
  getRangeExpansion,
  getNotesGainedThisMonth,
  hasAnyActivity,
  achievedPersonalBestToday,
  getUserProgress,
  updateUserProgress,
  getTotalScore,
  recordDailyActivity,
} from './repository.js';

// Compute motivation message using priority logic
function computeMotivation(streak, rangeExpansion, notesGainedThisMonth, hasActivity, achievedPB) {
  // Priority 1: Personal best achieved today
  if (achievedPB) {
    return {
      type: 'personal_best',
      message: 'You set a new personal best today!',
    };
  }

  // Priority 2: Range growth this month
  if (notesGainedThisMonth > 0) {
    const noteWord = notesGainedThisMonth === 1 ? 'note' : 'notes';
    return {
      type: 'range_growth',
      message: `You've expanded your range by ${notesGainedThisMonth} ${noteWord} this month!`,
    };
  }

  // Priority 3: Streak milestones (5, 10, 30, 50, 100, etc.)
  const milestones = [100, 50, 30, 10, 5];
  for (const milestone of milestones) {
    if (streak >= milestone && streak < milestone + 5) {
      return {
        type: 'streak_milestone',
        message: `Amazing! You've reached a ${milestone}-day streak!`,
      };
    }
  }

  // Priority 4: Generic streak message
  if (streak > 0) {
    const dayWord = streak === 1 ? 'day' : 'days';
    return {
      type: 'streak',
      message: `You're on a ${streak}-${dayWord} streak!`,
    };
  }

  // Priority 5: Welcome back (has previous activity but streak = 0)
  if (hasActivity) {
    return {
      type: 'welcome_back',
      message: 'Welcome back! Ready to practice?',
    };
  }

  // Priority 6: New user
  return {
    type: 'new_user',
    message: 'Welcome! Start your first exercise to begin your journey.',
  };
}

// GET /api/dashboard/stats
export async function getStats(request, reply) {
  const userId = request.user.id;

  // Fetch all data in parallel
  const [streak, weeklyActivity, rangeExpansion, notesGainedThisMonth, hasActivity, achievedPB, progress, score] =
    await Promise.all([
      getCurrentStreak(userId),
      getWeeklyActivity(userId),
      getRangeExpansion(userId),
      getNotesGainedThisMonth(userId),
      hasAnyActivity(userId),
      achievedPersonalBestToday(userId),
      getUserProgress(userId),
      getTotalScore(userId),
    ]);

  // Compute range expansion response
  let rangeExpansionResponse = null;
  if (rangeExpansion) {
    rangeExpansionResponse = {
      notesGainedThisMonth,
      notesGainedTotal: rangeExpansion.notesGainedTotal,
      originalLowestMidi: rangeExpansion.originalLow,
      originalHighestMidi: rangeExpansion.originalHigh,
    };
  }

  // Compute motivation
  const motivation = computeMotivation(streak, rangeExpansion, notesGainedThisMonth, hasActivity, achievedPB);

  return reply.send({
    streak: {
      currentStreak: streak,
      weeklyActivity,
    },
    rangeExpansion: rangeExpansionResponse,
    motivation,
    progress: {
      level: progress.level,
      node: progress.node,
      score,
    },
  });
}

// PATCH /api/dashboard/progress - Update user progress (level and node)
export async function updateProgressHandler(request, reply) {
  const userId = request.user.id;
  const { level, node } = request.body;

  if (level == null || typeof level !== 'number' || level < 1 || level > 5) {
    return reply.code(400).send({ error: 'level must be a number between 1 and 5' });
  }

  if (node == null || typeof node !== 'number' || node < 1) {
    return reply.code(400).send({ error: 'node must be a number >= 1' });
  }

  const updatedProgress = await updateUserProgress(userId, level, node);

  return reply.send({ level: updatedProgress.level, node: updatedProgress.node });
}

// POST /api/activity/ping - Record daily activity for streak (without recording attempt)
export async function recordActivityHandler(request, reply) {
  const userId = request.user.id;
  const { source = 'practice' } = request.body || {};

  await recordDailyActivity(userId, source);

  return reply.code(204).send();
}
