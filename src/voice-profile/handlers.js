import {
  getVoiceProfile,
  upsertVoiceProfile,
  saveVoiceExplorationSession,
  getVoiceExplorationHistory,
} from './repository.js';

// GET /api/voice-profile - Get user's current voice profile
export async function getProfile(request, reply) {
  const userId = request.user.id;

  const profile = await getVoiceProfile(userId);

  if (!profile) {
    return reply.code(200).send({ profile: null });
  }

  return reply.send({
    profile: {
      lowestMidi: profile.lowest_midi,
      highestMidi: profile.highest_midi,
      lastUpdated: profile.updated_at,
    },
  });
}

// POST /api/voice-profile - Save voice exploration session and update profile
export async function saveProfile(request, reply) {
  const userId = request.user.id;
  const { lowestMidi, highestMidi, durationMs } = request.body;

  request.log.debug({ lowestMidi, highestMidi, durationMs }, 'Saving voice profile');

  if (lowestMidi == null && highestMidi == null) {
    request.log.warn('Missing lowestMidi and highestMidi in request body');
    return reply.code(400).send({ error: 'lowestMidi or highestMidi is required' });
  }

  // Save the session history
  await saveVoiceExplorationSession(userId, lowestMidi, highestMidi, durationMs || null);
  request.log.debug('Saved exploration session');

  // Update the aggregate profile (expanding ranges)
  const updatedProfile = await upsertVoiceProfile(userId, lowestMidi, highestMidi);
  request.log.debug('Updated voice profile');

  return reply.code(201).send({
    profile: {
      lowestMidi: updatedProfile.lowest_midi,
      highestMidi: updatedProfile.highest_midi,
      lastUpdated: updatedProfile.updated_at,
    },
  });
}

// GET /api/voice-profile/history - Get voice exploration session history
export async function getHistory(request, reply) {
  const userId = request.user.id;
  const limit = parseInt(request.query.limit) || 10;

  const sessions = await getVoiceExplorationHistory(userId, Math.min(limit, 50));

  return reply.send({
    sessions: sessions.map((s) => ({
      id: s.id,
      lowestMidi: s.lowest_midi,
      highestMidi: s.highest_midi,
      durationMs: s.duration_ms,
      createdAt: s.created_at,
    })),
  });
}
