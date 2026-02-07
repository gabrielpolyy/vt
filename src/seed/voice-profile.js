export async function seed(db) {
  const email = 'gabriel.policiuc@gmail.com';

  // Find user
  const { rows: users } = await db.query('SELECT id FROM users WHERE email = $1', [email]);

  if (users.length === 0) {
    console.log(`         User ${email} not found. Run user seed first.`);
    return;
  }

  const userId = users[0].id;

  // Check if voice profile already exists
  const { rows: existing } = await db.query(
    'SELECT id FROM voice_profiles WHERE user_id = $1',
    [userId]
  );

  if (existing.length > 0) {
    console.log(`         Voice profile for ${email} already exists.`);
    return;
  }

  // Beginner with limited low range: A2 (45) to E3 (52) - a fifth
  const lowestMidi = 45;  // A2
  const highestMidi = 52; // E3

  await db.query(
    `INSERT INTO voice_profiles (user_id, lowest_midi, highest_midi)
     VALUES ($1, $2, $3)`,
    [userId, lowestMidi, highestMidi]
  );

  console.log(`         Created voice profile for ${email}: A2 (${lowestMidi}) to E3 (${highestMidi})`);

  // Create voice exploration sessions for completed warmups
  // User is at level 2, node 2 - so warmups L1N1, L1N2, L2N1 are completed
  // (each level has 2 nodes)
  const sessions = [
    { level: 1, node: 1 },
    { level: 1, node: 2 },
    { level: 2, node: 1 },
  ];
  for (const { level, node } of sessions) {
    await db.query(
      `INSERT INTO voice_exploration_sessions (user_id, lowest_midi, highest_midi, level, node)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, lowestMidi, highestMidi, level, node]
    );
  }

  console.log(`         Created ${sessions.length} voice exploration sessions (warmups)`);

  // Seed user_journey_progress so the mobile skill tree reflects actual progress
  // Without this, the LEFT JOIN in getJourneyList defaults to level 1, node 1
  const { rows: journeys } = await db.query(
    `SELECT id FROM journeys WHERE name = 'default' LIMIT 1`
  );

  if (journeys.length > 0) {
    const journeyId = journeys[0].id;
    await db.query(
      `INSERT INTO user_journey_progress (user_id, journey_id, level, node)
       VALUES ($1, $2, $3, $4)`,
      [userId, journeyId, 2, 2]
    );
    console.log(`         Set journey progress to level 2, node 2`);
  } else {
    console.log(`         No default journey found — skipped journey progress`);
  }
}
