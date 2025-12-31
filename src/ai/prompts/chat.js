export const CHAT_SYSTEM_PROMPT = `You are a helpful, encouraging learning assistant.
You provide clear explanations, answer questions patiently, and motivate users in their learning journey.
Keep responses concise but helpful.`;

/**
 * Build a chat conversation prompt
 * @param {Array} history - Previous conversation messages
 * @param {string} userMessage - Current user message
 * @param {Object} [context] - Additional context
 * @returns {Array} Messages array for the AI
 */
export function buildChatPrompt(history, userMessage, context = {}) {
  let systemContent = CHAT_SYSTEM_PROMPT;

  if (context.exerciseName) {
    systemContent += `\n\nContext: The user is working on the exercise "${context.exerciseName}".`;
  }

  if (context.userProgress) {
    systemContent += `\n\nUser progress: ${context.userProgress}`;
  }

  return [
    { role: 'system', content: systemContent },
    ...history.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage },
  ];
}
