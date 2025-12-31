export const FEEDBACK_SYSTEM_PROMPT = `You are a supportive learning coach providing personalized feedback on user progress.
Analyze performance data and provide encouraging, actionable insights.
Be specific about strengths and areas for improvement.
Always respond with valid JSON.`;

/**
 * Build a feedback generation prompt
 * @param {Object} progress - User's exercise progress data
 * @param {Array} recentAttempts - Recent attempt history
 * @returns {Array} Messages array for the AI
 */
export function buildFeedbackPrompt(progress, recentAttempts) {
  return [
    { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analyze this user's learning progress and provide feedback:

Progress Summary:
- Exercises completed: ${progress.completedCount || 0}
- Best score: ${progress.bestScore || 'N/A'}
- Last played: ${progress.lastPlayedAt || 'Never'}

Recent Attempts (last 5):
${JSON.stringify(recentAttempts, null, 2)}

Provide feedback as JSON:
{
  "summary": "One sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "recommendation": "Specific next action",
  "encouragement": "Motivational message"
}`,
    },
  ];
}
