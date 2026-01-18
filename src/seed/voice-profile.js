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

  // Create voice exploration sessions for levels 1-3 (to unlock exercises in those levels)
  // User is at level 3, node 2, so create sessions for all nodes up to that point
  const sessions = [
    { level: 1, node: 1 },
    { level: 1, node: 2 },
    { level: 1, node: 3 },
    { level: 2, node: 1 },
    { level: 2, node: 2 },
    { level: 2, node: 3 },
    { level: 3, node: 1 },
    { level: 3, node: 2 },
  ];
  for (const { level, node } of sessions) {
    await db.query(
      `INSERT INTO voice_exploration_sessions (user_id, lowest_midi, highest_midi, level, node)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, lowestMidi, highestMidi, level, node]
    );
  }

  console.log(`         Created voice exploration sessions for levels 1-3 with nodes`);
}
