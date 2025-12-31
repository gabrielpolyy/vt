export const EXERCISE_SYSTEM_PROMPT = `You are an expert exercise designer for a learning application.
You create engaging, progressive exercises with clear instructions and appropriate difficulty.
Always respond with valid JSON matching the requested schema.`;

/**
 * Build an exercise generation prompt
 * @param {Object} options
 * @param {string} options.topic - The topic for the exercise
 * @param {string} options.difficulty - 'beginner', 'intermediate', 'advanced'
 * @param {number} [options.stepCount] - Number of steps in the exercise
 * @param {Object} [options.context] - Additional context (user preferences, etc.)
 * @returns {Array} Messages array for the AI
 */
export function buildExercisePrompt({ topic, difficulty, stepCount = 5, context = {} }) {
  let systemContent = EXERCISE_SYSTEM_PROMPT;

  if (context.userLevel) {
    systemContent += `\n\nThe user's current level is: ${context.userLevel}`;
  }

  return [
    { role: 'system', content: systemContent },
    {
      role: 'user',
      content: `Create an exercise about "${topic}" with difficulty level "${difficulty}".

Include ${stepCount} progressive steps.

Respond with JSON in this format:
{
  "name": "Exercise name",
  "description": "Brief description",
  "icon": "emoji icon",
  "definition": {
    "steps": [
      {
        "type": "instruction|question|practice",
        "content": "Step content",
        "hint": "Optional hint",
        "answer": "Expected answer if applicable"
      }
    ],
    "estimatedMinutes": number
  }
}`,
    },
  ];
}
