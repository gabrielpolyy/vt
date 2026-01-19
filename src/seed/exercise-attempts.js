// Node to exercises mapping - each journey node unlocks specific exercises
// User completes warmup for a node, then can attempt that node's exercises
const nodeExercises = {
  // Level 1 - Foundations
  'L1N1': ['highway_pitch_intro', 'single_note_hold', 'three_note_intro', 'five_note_warmup'],
  'L1N2': ['highway_note_matching', 'quick_match_low', 'quick_match_mid', 'quick_match_full'],
  // Level 2 - Scales
  'L2N1': ['highway_major_scale', 'major_ascending', 'major_descending', 'major_full'],
  'L2N2': ['highway_minor_scale', 'minor_ascending', 'minor_descending', 'minor_full'],
  // Level 3 - Intervals
  'L3N1': ['highway_small_intervals', 'half_steps', 'whole_steps', 'thirds_practice'],
  'L3N2': ['highway_large_intervals', 'perfect_fourths', 'perfect_fifths', 'octave_jumps'],
  // Level 4 - Patterns
  'L4N1': ['highway_arpeggios', 'major_triad_arpeggio', 'minor_triad_arpeggio', 'seventh_arpeggio'],
  'L4N2': ['highway_melodic_sequences', 'sequence_pattern_1', 'sequence_pattern_2', 'combined_pattern'],
  // Level 5 - Advanced (not unlocked yet for this user)
  'L5N1': ['highway_precision', 'precision_scales', 'precision_arpeggios', 'chromatic_challenge'],
  'L5N2': ['highway_mastery', 'master_scale_test', 'master_interval_test', 'master_pattern_test'],
};

export async function seed(db) {
  const email = 'gabriel.policiuc@gmail.com';

  // Find user
  const { rows: users } = await db.query('SELECT id FROM users WHERE email = $1', [email]);

  if (users.length === 0) {
    console.log(`         User ${email} not found. Run user seed first.`);
    return;
  }

  const userId = users[0].id;

  // Check idempotency - skip if attempts already exist
  const { rows: existingAttempts } = await db.query(
    'SELECT COUNT(*) as count FROM exercise_attempts WHERE user_id = $1',
    [userId]
  );

  if (parseInt(existingAttempts[0].count) > 0) {
    console.log(`         Exercise attempts for ${email} already exist. Skipping.`);
    return;
  }

  // Get completed warmups to determine which nodes are unlocked
  const { rows: warmups } = await db.query(
    'SELECT DISTINCT level, node FROM voice_exploration_sessions WHERE user_id = $1',
    [userId]
  );

  // Build set of unlocked exercise slugs based on completed warmups
  const unlockedSlugs = new Set();
  for (const warmup of warmups) {
    const nodeKey = `L${warmup.level}N${warmup.node}`;
    const exercises = nodeExercises[nodeKey] || [];
    exercises.forEach(slug => unlockedSlugs.add(slug));
  }

  console.log(`         Unlocked nodes: ${warmups.map(w => `L${w.level}N${w.node}`).join(', ')}`);
  console.log(`         Unlocked exercises: ${unlockedSlugs.size}`);

  // Fetch exercises that are unlocked
  const { rows: exercises } = await db.query(
    'SELECT id, slug, type, sort_order, definition FROM exercises WHERE user_id IS NULL ORDER BY sort_order'
  );

  const exercisesToSeed = exercises.filter((ex) => unlockedSlugs.has(ex.slug));

  console.log(`         Generating attempts for ${exercisesToSeed.length} exercises...`);

  const now = new Date();
  const attempts = [];
  const progressMap = new Map();

  for (const exercise of exercisesToSeed) {
    const def = exercise.definition;
    const sortOrder = exercise.sort_order;

    // Calculate max score from definition
    const maxScore = calculateMaxScore(def, exercise.type);

    // Determine number of attempts based on exercise difficulty
    const attemptCount = getAttemptCount(sortOrder);

    // Calculate base timestamp - earlier exercises started earlier
    const daysAgo = Math.floor(21 - (sortOrder / 1100) * 14); // 21 to 7 days ago
    let attemptTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    let bestScore = 0;

    for (let i = 0; i < attemptCount; i++) {
      // Score progression: start around 40-65%, improve to 75-98%
      const progressRatio = i / (attemptCount - 1 || 1);
      const minPct = 0.4 + progressRatio * 0.35; // 40% -> 75%
      const maxPct = 0.65 + progressRatio * 0.33; // 65% -> 98%

      // Add some randomness and occasional regressions
      let scorePct = minPct + Math.random() * (maxPct - minPct);
      if (i > 0 && Math.random() < 0.15) {
        // 15% chance of regression
        scorePct *= 0.85 + Math.random() * 0.1;
      }

      const score = Math.round(maxScore * Math.min(scorePct, 0.98));
      if (score > bestScore) bestScore = score;

      // Generate result JSONB
      const result = generateResult(def, exercise.type, score, maxScore);

      attempts.push({
        userId,
        exerciseId: exercise.id,
        score,
        completed: true,
        result,
        createdAt: attemptTime,
      });

      // Add 1-4 days between attempts
      attemptTime = new Date(attemptTime.getTime() + (1 + Math.random() * 3) * 24 * 60 * 60 * 1000);
    }

    // Track progress for this exercise
    progressMap.set(exercise.id, {
      completedCount: attemptCount,
      bestScore,
      lastPlayedAt: attempts[attempts.length - 1].createdAt,
    });
  }

  // Insert all attempts
  console.log(`         Inserting ${attempts.length} attempts...`);

  for (const attempt of attempts) {
    await db.query(
      `INSERT INTO exercise_attempts (user_id, exercise_id, score, completed, result, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        attempt.userId,
        attempt.exerciseId,
        attempt.score,
        attempt.completed,
        JSON.stringify(attempt.result),
        attempt.createdAt,
      ]
    );
  }

  // Insert progress records
  console.log(`         Inserting ${progressMap.size} progress records...`);

  for (const [exerciseId, progress] of progressMap) {
    await db.query(
      `INSERT INTO exercise_progress (user_id, exercise_id, completed_count, best_score, last_played_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, exerciseId, progress.completedCount, progress.bestScore, progress.lastPlayedAt]
    );
  }

  console.log(`         Created ${attempts.length} attempts and ${progressMap.size} progress records.`);
}

function calculateMaxScore(def, type) {
  if (type === 'pitch') {
    // Count total notes across all steps
    let noteCount = 0;
    if (def.steps) {
      for (const step of def.steps) {
        if (step.notes) {
          noteCount += step.notes.length;
        }
      }
    }
    return noteCount * 20; // 20 points per note
  } else if (type === 'highway') {
    // Count voice cues only
    const voiceCueCount = def.cues?.filter(cue => cue.kind === 'voice').length || 0;
    return voiceCueCount * 20; // 20 points per voice cue
  }
  return 100; // default fallback
}

function getAttemptCount(sortOrder) {
  if (sortOrder <= 200) {
    // Early exercises: 5-12 attempts
    return 5 + Math.floor(Math.random() * 8);
  } else if (sortOrder <= 500) {
    // Intermediate: 3-8 attempts
    return 3 + Math.floor(Math.random() * 6);
  } else {
    // Advanced: 2-6 attempts
    return 2 + Math.floor(Math.random() * 5);
  }
}

function generateResult(def, type, score, maxScore) {
  const hitRatio = score / maxScore;

  if (type === 'pitch') {
    return generatePitchResult(def, hitRatio);
  } else if (type === 'highway') {
    return generateHighwayResult(def, hitRatio);
  }

  return {};
}

function generatePitchResult(def, hitRatio) {
  const stepResults = [];
  let totalNotes = 0;
  let hitCount = 0;
  let perfectCount = 0;

  if (def.steps) {
    for (const step of def.steps) {
      const noteResults = [];
      if (step.notes) {
        for (let i = 0; i < step.notes.length; i++) {
          totalNotes++;
          const note = step.notes[i];

          // Determine if this note was hit (based on overall hit ratio with some variance)
          const wasHit = Math.random() < hitRatio + 0.1;
          const wasPerfect = wasHit && Math.random() < 0.3;

          if (wasHit) hitCount++;
          if (wasPerfect) perfectCount++;

          // Generate cents offset (-50 to +50, closer to 0 for better performance)
          const centsOffset = wasHit
            ? Math.round((Math.random() - 0.5) * (wasPerfect ? 20 : 60))
            : Math.round((Math.random() - 0.5) * 100);

          noteResults.push({
            noteIndex: i,
            targetMidi: note.pitchTargetMidi,
            hit: wasHit,
            perfect: wasPerfect,
            centsOffset,
          });
        }
      }
      stepResults.push({
        stepId: step.id,
        noteResults,
      });
    }
  }

  return {
    stepResults,
    totalNotes,
    hitCount,
    perfectCount,
  };
}

function generateHighwayResult(def, hitRatio) {
  const cueResults = [];
  let totalCues = 0;
  let hitCount = 0;
  let perfectCount = 0;

  // Only process voice cues (not pause or subtitleLineBreak)
  const voiceCues = def.cues?.filter(cue => cue.kind === 'voice') || [];
  for (const cue of voiceCues) {
    totalCues++;

    const wasHit = Math.random() < hitRatio + 0.1;
    const wasPerfect = wasHit && Math.random() < 0.25;

    if (wasHit) hitCount++;
    if (wasPerfect) perfectCount++;

    const cueScore = wasPerfect ? 20 : wasHit ? Math.floor(10 + Math.random() * 8) : Math.floor(Math.random() * 5);

    cueResults.push({
      cueId: cue.id,
      score: cueScore,
      hit: wasHit,
      perfect: wasPerfect,
      targetMidi: cue.pitchTargetMidi,
    });
  }

  return {
    cueResults,
    totalCues,
    hitCount,
    perfectCount,
  };
}
