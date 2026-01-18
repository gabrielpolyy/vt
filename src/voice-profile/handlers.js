import {
  getVoiceProfile,
  upsertVoiceProfile,
  saveVoiceExplorationSession,
  getVoiceExplorationHistory,
  saveSessionWithSamples,
  upsertVoiceProfileWithConfidence,
} from './repository.js';
import { analyzeRange } from './analysis.js';

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
  const { lowestMidi, highestMidi } = request.body;

  request.log.debug({ lowestMidi, highestMidi }, 'Saving voice profile');

  if (lowestMidi == null && highestMidi == null) {
    request.log.warn('Missing lowestMidi and highestMidi in request body');
    return reply.code(400).send({ error: 'lowestMidi or highestMidi is required' });
  }

  // Save the session history
  await saveVoiceExplorationSession(userId, lowestMidi, highestMidi);
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
      createdAt: s.created_at,
    })),
  });
}

// POST /api/voice-profile/session - Save warmup session with full pitch history
export async function saveWarmupSession(request, reply) {
  const userId = request.user.id;
  const { samples, level, node } = request.body;

  if (!samples || !Array.isArray(samples)) {
    return reply.code(400).send({ error: 'samples array is required' });
  }

  request.log.debug({ sampleCount: samples.length }, 'Analyzing warmup session');

  // Run the percentile-based range analysis
  const { lowestMidi, highestMidi, confidence, valid, reason, stats } = analyzeRange(samples);

  request.log.info({ lowestMidi, highestMidi, confidence, valid, reason, stats }, 'Range analysis complete');

  // Save the session with raw samples for future ML training
  await saveSessionWithSamples(
    userId,
    lowestMidi,
    highestMidi,
    samples,
    confidence,
    level,
    node
  );

  // Update the aggregate profile if we got valid results
  let updatedProfile = null;
  if (lowestMidi !== null || highestMidi !== null) {
    request.log.info({ lowestMidi, highestMidi, confidence }, 'Updating voice profile');
    updatedProfile = await upsertVoiceProfileWithConfidence(
      userId,
      lowestMidi,
      highestMidi,
      confidence
    );
    request.log.info({ updatedProfile }, 'Voice profile updated');
  } else {
    request.log.warn('Skipping profile update - both lowestMidi and highestMidi are null');
  }

  return reply.code(201).send({
    analysis: {
      lowestMidi,
      highestMidi,
      confidence,
      valid,
      reason,
      stats,
    },
    profile: updatedProfile
      ? {
          lowestMidi: updatedProfile.lowest_midi,
          highestMidi: updatedProfile.highest_midi,
          confidenceScore: updatedProfile.confidence_score,
          lastUpdated: updatedProfile.updated_at,
        }
      : null,
  });
}
