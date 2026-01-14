import { getExerciseBySlug, getAllExercises, getExercisesByType } from './repository.js';
import { getVoiceProfile } from '../voice-profile/repository.js';
import { transposeForVoiceProfile } from './transposition.js';

// GET /api/exercises - List all exercises
export async function listExercises(request, reply) {
  const { type } = request.query;

  const exercises = type
    ? await getExercisesByType(type)
    : await getAllExercises();

  return reply.send({ exercises });
}

// GET /api/exercises/:slug - Get exercise by slug
export async function getExercise(request, reply) {
  const { slug } = request.params;
  const userId = request.user.id;

  const exercise = await getExerciseBySlug(slug);

  if (!exercise) {
    return reply.code(404).send({ error: 'Exercise not found' });
  }

  // Get user's voice profile and transpose exercise
  const voiceProfile = await getVoiceProfile(userId);
  const definition = transposeForVoiceProfile(exercise.definition, voiceProfile);

  return reply.send(definition);
}
