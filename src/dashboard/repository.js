import { db } from '../db.js';

// Get current streak - count consecutive days with exercise_attempts OR user_activity entries
export async function getCurrentStreak(userId) {
  const result = await db.query(
    `WITH activity_dates AS (
      -- Include both exercise_attempts and user_activity for streak calculation
      SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as activity_date
      FROM exercise_attempts
      WHERE user_id = $1
        AND DATE(created_at AT TIME ZONE 'UTC') <= CURRENT_DATE
      UNION
      SELECT DISTINCT activity_date
      FROM user_activity
      WHERE user_id = $1
        AND activity_date <= CURRENT_DATE
    ),
    numbered AS (
      SELECT activity_date,
             ROW_NUMBER() OVER (ORDER BY activity_date DESC) as rn
      FROM activity_dates
    ),
    streak AS (
      SELECT activity_date, rn,
             (activity_date + rn::int) AS grp
      FROM numbered
    )
    SELECT
      CASE
        WHEN (SELECT activity_date FROM numbered WHERE rn = 1) = CURRENT_DATE
        THEN (SELECT COUNT(*)::int FROM streak WHERE grp = (SELECT grp FROM streak WHERE rn = 1))
        ELSE 0
      END as streak_count`,
    [userId]
  );

  return result.rows[0]?.streak_count || 0;
}

// Get weekly activity - array of 7 booleans for last 7 days (index 0 = oldest)
export async function getWeeklyActivity(userId) {
  const result = await db.query(
    `SELECT
      (CURRENT_DATE - i) AS day,
      (
        EXISTS(
          SELECT 1 FROM exercise_attempts
          WHERE user_id = $1
          AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE - i
        )
        OR EXISTS(
          SELECT 1 FROM user_activity
          WHERE user_id = $1
          AND activity_date = CURRENT_DATE - i
        )
      ) as has_activity
    FROM generate_series(6, 0, -1) AS i
    ORDER BY i DESC`,
    [userId]
  );

  return result.rows.map((row) => row.has_activity);
}

// Get range expansion data - compare current voice profile to first session
export async function getRangeExpansion(userId) {
  const result = await db.query(
    `SELECT
      vp.lowest_midi as current_low,
      vp.highest_midi as current_high,
      first_session.lowest_midi as original_low,
      first_session.highest_midi as original_high,
      first_session.created_at as first_session_date
    FROM voice_profiles vp
    LEFT JOIN LATERAL (
      SELECT lowest_midi, highest_midi, created_at
      FROM voice_exploration_sessions
      WHERE user_id = $1
      ORDER BY created_at ASC
      LIMIT 1
    ) first_session ON true
    WHERE vp.user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const currentLow = row.current_low;
  const currentHigh = row.current_high;
  const originalLow = row.original_low ?? currentLow;
  const originalHigh = row.original_high ?? currentHigh;

  // Total notes gained = notes gained low + notes gained high
  const notesGainedLow = Math.max(0, originalLow - currentLow);
  const notesGainedHigh = Math.max(0, currentHigh - originalHigh);
  const notesGainedTotal = notesGainedLow + notesGainedHigh;

  return {
    currentLow,
    currentHigh,
    originalLow,
    originalHigh,
    notesGainedTotal,
  };
}

// Get notes gained this month by comparing to profile at start of month
export async function getNotesGainedThisMonth(userId) {
  const result = await db.query(
    `SELECT
      vp.lowest_midi as current_low,
      vp.highest_midi as current_high,
      COALESCE(month_start.lowest_midi, vp.lowest_midi) as month_start_low,
      COALESCE(month_start.highest_midi, vp.highest_midi) as month_start_high
    FROM voice_profiles vp
    LEFT JOIN LATERAL (
      SELECT lowest_midi, highest_midi
      FROM voice_exploration_sessions
      WHERE user_id = $1
        AND created_at < DATE_TRUNC('month', CURRENT_DATE)
      ORDER BY created_at DESC
      LIMIT 1
    ) month_start ON true
    WHERE vp.user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) {
    return 0;
  }

  const notesGainedLow = Math.max(0, row.month_start_low - row.current_low);
  const notesGainedHigh = Math.max(0, row.current_high - row.month_start_high);

  return notesGainedLow + notesGainedHigh;
}

// Check if user has any previous activity (from exercise_attempts or user_activity)
export async function hasAnyActivity(userId) {
  const result = await db.query(
    `SELECT (
      EXISTS(SELECT 1 FROM exercise_attempts WHERE user_id = $1)
      OR EXISTS(SELECT 1 FROM user_activity WHERE user_id = $1)
    ) as has_activity`,
    [userId]
  );
  return result.rows[0]?.has_activity || false;
}

// Check if user achieved a personal best today
export async function achievedPersonalBestToday(userId) {
  const result = await db.query(
    `SELECT EXISTS(
      SELECT 1
      FROM exercise_progress ep
      JOIN exercise_attempts ea ON ep.exercise_id = ea.exercise_id AND ep.user_id = ea.user_id
      WHERE ep.user_id = $1
        AND DATE(ea.created_at AT TIME ZONE 'UTC') = CURRENT_DATE
        AND ea.score = ep.best_score
        AND ep.completed_count > 1
    ) as achieved_pb`,
    [userId]
  );
  return result.rows[0]?.achieved_pb || false;
}

// Get user's current progress (level and node)
export async function getUserProgress(userId) {
  const result = await db.query(
    `SELECT level, node FROM users WHERE id = $1`,
    [userId]
  );
  return {
    level: result.rows[0]?.level || 1,
    node: result.rows[0]?.node || 1,
  };
}

// Update user's progress (level and node)
export async function updateUserProgress(userId, level, node) {
  const result = await db.query(
    `UPDATE users SET level = $1, node = $2 WHERE id = $3 RETURNING level, node`,
    [level, node, userId]
  );
  return {
    level: result.rows[0]?.level,
    node: result.rows[0]?.node,
  };
}

// Get total score - sum of best_score from exercise_progress
export async function getTotalScore(userId) {
  const result = await db.query(
    `SELECT COALESCE(SUM(best_score), 0)::int as total_score
    FROM exercise_progress
    WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]?.total_score || 0;
}

// Record daily activity for streak purposes (idempotent - safe to call multiple times)
export async function recordDailyActivity(userId, source = 'practice') {
  await db.query(
    `INSERT INTO user_activity (user_id, activity_date, source)
    VALUES ($1, CURRENT_DATE, $2)
    ON CONFLICT (user_id, activity_date, source) DO NOTHING`,
    [userId, source]
  );
}

// Get user's journey-specific progress
export async function getUserJourneyProgress(userId, journeyId) {
  const result = await db.query(
    `SELECT level, node FROM user_journey_progress WHERE user_id = $1 AND journey_id = $2`,
    [userId, journeyId]
  );
  return {
    level: result.rows[0]?.level || 1,
    node: result.rows[0]?.node || 1,
  };
}

// Update user's journey-specific progress (upsert)
export async function updateUserJourneyProgress(userId, journeyId, level, node) {
  const result = await db.query(
    `INSERT INTO user_journey_progress (user_id, journey_id, level, node, last_active_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, journey_id)
     DO UPDATE SET level = $3, node = $4, last_active_at = NOW()
     RETURNING level, node`,
    [userId, journeyId, level, node]
  );
  return {
    level: result.rows[0]?.level,
    node: result.rows[0]?.node,
  };
}
