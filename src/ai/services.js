import { aiClient } from './client.js';
import { aiConfig } from './config.js';
import { buildExercisePrompt, buildChatPrompt, buildFeedbackPrompt, buildHighwayPrompt } from './prompts/index.js';
import { AIResponseError } from './errors.js';

/**
 * Generate a new exercise
 * @param {Object} options
 * @param {string} options.topic - Topic for the exercise
 * @param {string} options.difficulty - Difficulty level
 * @param {number} [options.stepCount] - Number of steps
 * @param {Object} [options.context] - Additional context
 * @param {string} [options.provider] - AI provider to use
 * @returns {Promise<Object>} Generated exercise data
 */
export async function generateExercise({ topic, difficulty, stepCount = 5, context = {}, provider }) {
  const messages = buildExercisePrompt({ topic, difficulty, stepCount, context });
  const useCaseConfig = aiConfig.useCases.exerciseGeneration;

  const result = await aiClient.generateJSON({
    provider,
    messages,
    modelTier: 'advanced',
    temperature: useCaseConfig.temperature,
    maxTokens: useCaseConfig.maxTokens,
  });

  // Validate the response structure
  if (!result.data.name || !result.data.definition?.steps) {
    throw new AIResponseError('Invalid exercise structure in response', result.provider);
  }

  return result.data;
}

/**
 * Send a chat message and get a response
 * @param {Object} options
 * @param {Array} [options.history] - Conversation history
 * @param {string} options.message - User's message
 * @param {Object} [options.context] - Additional context
 * @param {string} [options.provider] - AI provider to use
 * @returns {Promise<{reply: string, usage: Object, provider: string}>}
 */
export async function chat({ history = [], message, context = {}, provider }) {
  const messages = buildChatPrompt(history, message, context);
  const useCaseConfig = aiConfig.useCases.chat;

  const result = await aiClient.chat({
    provider,
    messages,
    modelTier: 'fast',
    temperature: useCaseConfig.temperature,
    maxTokens: useCaseConfig.maxTokens,
  });

  return {
    reply: result.content,
    usage: result.usage,
    provider: result.provider,
  };
}

/**
 * Generate feedback on user progress
 * @param {Object} options
 * @param {Object} options.progress - User's progress data
 * @param {Array} options.recentAttempts - Recent attempt records
 * @param {string} [options.provider] - AI provider to use
 * @returns {Promise<Object>} Feedback data
 */
export async function generateFeedback({ progress, recentAttempts, provider }) {
  const messages = buildFeedbackPrompt(progress, recentAttempts);
  const useCaseConfig = aiConfig.useCases.feedback;

  const result = await aiClient.generateJSON({
    provider,
    messages,
    modelTier: 'standard',
    temperature: useCaseConfig.temperature,
    maxTokens: useCaseConfig.maxTokens,
  });

  return result.data;
}

/**
 * Generate a highway exercise with pitch cues
 * @param {Object} options
 * @param {string} options.trackId - Identifier for the track
 * @param {string} options.difficulty - 'beginner', 'intermediate', 'advanced'
 * @param {Object} options.vocalRange - { minMidi, maxMidi } user's vocal range
 * @param {number} [options.durationMs] - Target duration (default 15000)
 * @param {number} [options.cueCount] - Number of cues (default 5)
 * @param {Object} [options.context] - Additional context (performance data)
 * @param {string} [options.provider] - AI provider to use
 * @returns {Promise<Object>} Generated highway exercise
 */
export async function generateHighwayExercise({
  trackId,
  difficulty,
  vocalRange,
  durationMs = 15000,
  cueCount = 5,
  context = {},
  provider,
}) {
  if (!vocalRange?.minMidi || !vocalRange?.maxMidi) {
    throw new Error('vocalRange with minMidi and maxMidi is required');
  }
  if (vocalRange.minMidi >= vocalRange.maxMidi) {
    throw new Error('vocalRange.minMidi must be less than maxMidi');
  }

  const messages = buildHighwayPrompt({
    trackId,
    difficulty,
    vocalRange,
    durationMs,
    cueCount,
    context,
  });

  const useCaseConfig = aiConfig.useCases.highwayGeneration;

  const result = await aiClient.generateJSON({
    provider,
    messages,
    modelTier: 'advanced',
    temperature: useCaseConfig.temperature,
    maxTokens: useCaseConfig.maxTokens,
  });

  validateHighwayExercise(result.data, vocalRange, durationMs);

  return result.data;
}

/**
 * Validate a generated highway exercise
 * @param {Object} exercise - The generated exercise
 * @param {Object} vocalRange - { minMidi, maxMidi }
 * @param {number} durationMs - Maximum duration
 * @throws {AIResponseError} If validation fails
 */
function validateHighwayExercise(exercise, vocalRange, durationMs) {
  if (!exercise.trackId || !exercise.cues || !Array.isArray(exercise.cues)) {
    throw new AIResponseError('Invalid highway exercise structure: missing trackId or cues');
  }

  if (exercise.cues.length === 0) {
    throw new AIResponseError('Highway exercise must have at least one cue');
  }

  let lastTimeOut = 0;

  for (let i = 0; i < exercise.cues.length; i++) {
    const cue = exercise.cues[i];

    if (!cue.kind || !cue.text || cue.timeIn === undefined ||
        cue.timeOut === undefined || cue.pitchTargetMidi === undefined || !cue.id) {
      throw new AIResponseError(`Cue ${i} is missing required fields`);
    }

    if (cue.pitchTargetMidi < vocalRange.minMidi || cue.pitchTargetMidi > vocalRange.maxMidi) {
      throw new AIResponseError(
        `Cue ${i} pitchTargetMidi (${cue.pitchTargetMidi}) is outside vocal range [${vocalRange.minMidi}, ${vocalRange.maxMidi}]`
      );
    }

    if (cue.timeIn >= cue.timeOut) {
      throw new AIResponseError(`Cue ${i} has invalid timing: timeIn (${cue.timeIn}) >= timeOut (${cue.timeOut})`);
    }

    if (cue.timeOut > durationMs) {
      throw new AIResponseError(`Cue ${i} timeOut (${cue.timeOut}) exceeds duration (${durationMs})`);
    }

    if (cue.timeIn < lastTimeOut) {
      throw new AIResponseError(`Cue ${i} overlaps with previous cue`);
    }

    lastTimeOut = cue.timeOut;
  }
}
