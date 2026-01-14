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

  // Reasonable male baritone range: G2 (43) to G4 (67)
  const lowestMidi = 43;  // G2
  const highestMidi = 67; // G4

  await db.query(
    `INSERT INTO voice_profiles (user_id, lowest_midi, highest_midi)
     VALUES ($1, $2, $3)`,
    [userId, lowestMidi, highestMidi]
  );

  console.log(`         Created voice profile for ${email}: G2 (${lowestMidi}) to G4 (${highestMidi})`);
}
