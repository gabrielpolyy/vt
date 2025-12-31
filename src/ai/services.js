import { aiClient } from './client.js';
import { aiConfig } from './config.js';
import { buildExercisePrompt, buildChatPrompt, buildFeedbackPrompt } from './prompts/index.js';
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
