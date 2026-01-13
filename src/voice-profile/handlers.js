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

  // Transform to match iOS model
  return reply.send({
    profile: {
      segments: {
        comfortable_low: profile.comfortable_low_min
          ? { minMidi: profile.comfortable_low_min, maxMidi: profile.comfortable_low_max }
          : null,
        lowest_safe: profile.lowest_safe_min
          ? { minMidi: profile.lowest_safe_min, maxMidi: profile.lowest_safe_max }
          : null,
        comfortable_mid: profile.comfortable_mid_min
          ? { minMidi: profile.comfortable_mid_min, maxMidi: profile.comfortable_mid_max }
          : null,
        comfortable_high: profile.comfortable_high_min
          ? { minMidi: profile.comfortable_high_min, maxMidi: profile.comfortable_high_max }
          : null,
        highest_safe: profile.highest_safe_min
          ? { minMidi: profile.highest_safe_min, maxMidi: profile.highest_safe_max }
          : null,
      },
      lastUpdated: profile.updated_at,
    },
  });
}

// POST /api/voice-profile - Save voice exploration session and update profile
export async function saveProfile(request, reply) {
  const userId = request.user.id;
  const { segments, durationMs } = request.body;

  console.log(`[voice-profile] Saving profile for user ${userId}:`, {
    segmentKeys: segments ? Object.keys(segments) : 'null',
    durationMs,
  });

  if (!segments) {
    console.log(`[voice-profile] Missing segments in request body`);
    return reply.code(400).send({ error: 'segments is required' });
  }

  // Save the session history
  await saveVoiceExplorationSession(userId, segments, durationMs || null);
  console.log(`[voice-profile] Saved exploration session for user ${userId}`);

  // Update the aggregate profile (expanding ranges)
  const updatedProfile = await upsertVoiceProfile(userId, segments);
  console.log(`[voice-profile] Updated profile for user ${userId}`);

  return reply.code(201).send({
    profile: {
      segments: {
        comfortable_low: updatedProfile.comfortable_low_min
          ? { minMidi: updatedProfile.comfortable_low_min, maxMidi: updatedProfile.comfortable_low_max }
          : null,
        lowest_safe: updatedProfile.lowest_safe_min
          ? { minMidi: updatedProfile.lowest_safe_min, maxMidi: updatedProfile.lowest_safe_max }
          : null,
        comfortable_mid: updatedProfile.comfortable_mid_min
          ? { minMidi: updatedProfile.comfortable_mid_min, maxMidi: updatedProfile.comfortable_mid_max }
          : null,
        comfortable_high: updatedProfile.comfortable_high_min
          ? { minMidi: updatedProfile.comfortable_high_min, maxMidi: updatedProfile.comfortable_high_max }
          : null,
        highest_safe: updatedProfile.highest_safe_min
          ? { minMidi: updatedProfile.highest_safe_min, maxMidi: updatedProfile.highest_safe_max }
          : null,
      },
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
      segments: {
        comfortable_low: s.comfortable_low_min
          ? { minMidi: s.comfortable_low_min, maxMidi: s.comfortable_low_max }
          : null,
        lowest_safe: s.lowest_safe_min
          ? { minMidi: s.lowest_safe_min, maxMidi: s.lowest_safe_max }
          : null,
        comfortable_mid: s.comfortable_mid_min
          ? { minMidi: s.comfortable_mid_min, maxMidi: s.comfortable_mid_max }
          : null,
        comfortable_high: s.comfortable_high_min
          ? { minMidi: s.comfortable_high_min, maxMidi: s.comfortable_high_max }
          : null,
        highest_safe: s.highest_safe_min
          ? { minMidi: s.highest_safe_min, maxMidi: s.highest_safe_max }
          : null,
      },
      durationMs: s.duration_ms,
      createdAt: s.created_at,
    })),
  });
}
